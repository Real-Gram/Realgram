'use strict';
const crypto = require('crypto');
const fs = require('fs');

/** HTTP v1 FCM sender. Service-account credentials stay outside the repository.
 * No new SDK dependency and no per-call credentials in the push payload. */
function createPushSender({ credentials, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  let cached = null;
  let refreshing = null;
  async function accessToken() {
    if (cached && cached.expiresAt > now() + 60000) return cached.token;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const iat = Math.floor(now() / 1000);
      const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
        iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600,
      });
      const signature = crypto.sign('RSA-SHA256', Buffer.from(body), credentials.private_key).toString('base64url');
      const response = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: body + '.' + signature }),
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error('push OAuth rejected');
      const data = await response.json();
      if (!data.access_token) throw new Error('push OAuth missing token');
      cached = { token: data.access_token, expiresAt: now() + Math.min(3600, Number(data.expires_in) || 3600) * 1000 };
      return cached.token;
    })();
    try { return await refreshing; } finally { refreshing = null; }
  }
  return async function send(token, deviceId, event) {
    if (!credentials?.project_id || !credentials?.private_key || !credentials?.client_email) return { sent: false, reason: 'not_configured' };
    if (!['call:incoming', 'call:ended'].includes(event.type)) return { sent: false, reason: 'unsupported_event' };
    const remaining = Number(event.expires_at) - Math.floor(now() / 1000);
    if (event.type === 'call:incoming' && !(remaining > 0 && remaining <= 45)) return { sent: false, reason: 'expired' };
    const data = { type: event.type, call_id: String(event.call_id), device_id: deviceId };
    if (event.type === 'call:incoming') {
      data.caller_user_id = String(event.caller_user_id || 'RealGram');
      data.kind = event.kind === 'video' ? 'video' : 'audio';
      data.expires_at = String(event.expires_at);
    }
    const response = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(credentials.project_id)}/messages:send`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, data, android: { priority: 'HIGH', ttl: `${event.type === 'call:incoming' ? remaining : 45}s` } } }),
      signal: AbortSignal.timeout(4000),
    });
    if (response.status === 401) cached = null;
    // No token, payload or provider error body in logs.
    return { sent: response.ok, reason: response.ok ? 'sent' : `provider_${response.status}` };
  };
}
function configuredSender() {
  const filename = process.env.REALGRAM_FCM_CREDENTIALS;
  let credentials;
  if (filename) {
    try { credentials = JSON.parse(fs.readFileSync(filename, 'utf8')); }
    catch { console.error('[call-push] credential file unavailable or invalid'); }
  }
  return createPushSender({ credentials });
}
module.exports = { createPushSender, configuredSender };
