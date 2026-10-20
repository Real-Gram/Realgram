'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createPushSender } = require('./push');
const private_key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const credentials = { project_id: 'test-project', client_email: 'test@example.invalid', private_key };
const now = () => 1000000;
const event = { type: 'call:incoming', call_id: 'a'.repeat(32), caller_user_id: 'Alice', kind: 'video', expires_at: 1045, sdp: 'MUST-NOT-LEAK' };
test('unconfigured push is an explicit no-op', async () => {
  assert.deepEqual(await createPushSender()('token', 'dev', event), { sent: false, reason: 'not_configured' });
});
test('expired and unsupported events never contact the provider', async () => {
  const send = createPushSender({ credentials, now, fetchImpl: () => { throw Error('unexpected network'); } });
  assert.equal((await send('token', 'dev', { ...event, expires_at: 999 })).reason, 'expired');
  assert.equal((await send('token', 'dev', { ...event, type: 'call:signal' })).reason, 'unsupported_event');
});
test('data-only high priority invite, bounded TTL, minimal payload and OAuth cache', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ access_token: 'test-access', expires_in: 3600 }) };
  };
  const send = createPushSender({ credentials, now, fetchImpl });
  assert.equal((await send('private-device-token', 'dev-b', event)).sent, true);
  assert.equal((await send('private-device-token', 'dev-b', { type: 'call:ended', call_id: event.call_id })).sent, true);
  assert.equal(requests.length, 3, 'one OAuth request, two sends');
  const message = JSON.parse(requests[1].options.body).message;
  assert.equal(message.android.priority, 'HIGH');
  assert.equal(message.android.ttl, '45s');
  assert.equal(message.notification, undefined);
  assert.equal(message.data.device_id, 'dev-b');
  assert.equal(message.data.kind, 'video');
  assert.equal(message.data.sdp, undefined);
  assert.equal(message.data.voucher, undefined);
  assert.equal(JSON.parse(requests[2].options.body).message.data.caller_user_id, undefined);
});
test('OAuth failure is not cached as success; retry can recover', async () => {
  let count = 0;
  const send = createPushSender({ credentials, now, fetchImpl: async () => {
    count++;
    return { ok: count !== 1, json: async () => ({ access_token: 'test-access' }) };
  } });
  await assert.rejects(send('token', 'dev', event), /OAuth rejected/);
  assert.equal((await send('token', 'dev', event)).sent, true);
  assert.equal(count, 3);
});
