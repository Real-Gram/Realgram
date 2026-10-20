<?php
require_once __DIR__ . '/../lib/quota_economy.php';
require_once __DIR__ . '/../lib/messaging.php';
require_once __DIR__ . '/../lib/calling.php';
$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec("CREATE TABLE devices (device_id TEXT PRIMARY KEY, user_id TEXT, referral_code TEXT, plan TEXT, blocked INTEGER DEFAULT 0)");
$db->exec("INSERT INTO devices VALUES ('alice','Alice','A','premium',0), ('bob','Bob','B','free',0), ('eve','Eve','E','premium',0)");
function verify(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException('FAIL: ' . $label);
    echo 'PASS: ' . $label . PHP_EOL;
}
$id = 'rg_test_unique_00001';
$first = dm_send($db, 'alice', 'Bob', 'سلام', 10, $id);
$again = dm_send($db, 'alice', 'bob', 'سلام', 10, $id);
verify($first['message_id'] === $again['message_id'], 'response loss + retry returns original acknowledgement');
verify((int)$db->query('SELECT COUNT(*) FROM user_messages')->fetchColumn() === 1, 'exactly one message is stored');
try { dm_send($db, 'alice', 'bob', 'different', 10, $id); throw new LogicException('accepted wrong content'); }
catch (RuntimeException $e) { verify($e->getMessage() === 'client message id already used', 'id cannot be reused for different content'); }
$db->exec('DELETE FROM user_messages');
$afterBurn = dm_send($db, 'alice', 'bob', 'سلام', 10, $id);
verify($afterBurn['message_id'] === $first['message_id'], 'receipt survives disappearance');
verify((int)$db->query('SELECT COUNT(*) FROM user_messages')->fetchColumn() === 0, 'retry never resurrects a deleted message');
// Failed writes do not poison the retry key.
try { dm_send($db, 'alice', 'bob', '', 0, 'rg_failed_request_0001'); } catch (RuntimeException $e) {}
verify((int)$db->query("SELECT COUNT(*) FROM message_send_receipts WHERE client_message_id='rg_failed_request_0001'")->fetchColumn() === 0, 'failed send rolls back its receipt');

call_ensure_schema($db);
$db->prepare("UPDATE settings SET value=? WHERE key='calling_relay_secret'")->execute(['not-a-real-secret']);
$proof = call_presence_token($db, 'bob')['token'];
$token = str_repeat('test-push-token-', 5);
call_push_register($db, 'bob', $proof, $token, true);
verify(call_push_tokens($db, 'bob') === [$token], 'free-plan recipient can register push');
try { call_push_register($db, 'eve', $proof, $token, true); throw new LogicException('wrong device accepted'); }
catch (RuntimeException $e) { verify($e->getMessage() === 'invalid device proof', 'registration rejects another device voucher'); }
call_push_register($db, 'bob', $proof, $token . 'rotated', true);
verify(call_push_tokens($db, 'bob') === [$token . 'rotated'], 'token rotation removes the old token');
$call = call_initiate($db, 'alice', 'bob');
verify(call_pending($db, 'bob')['call_id'] === $call['call_id'], 'pending call recovered without an open socket');
verify(call_pending($db, 'eve') === null, 'another device cannot recover the call');
call_mark_ended($db, $call['call_id'], 'alice', 'caller_hangup');
verify(call_pending($db, 'bob') === null, 'cancelled call cannot ring on resume');
$call = call_initiate($db, 'alice', 'bob');
$db->exec("UPDATE call_sessions SET started_at=datetime('now','-60 seconds') WHERE status='ringing'");
verify(call_pending($db, 'bob') === null, 'expired call cannot ring on resume');
try { call_callee_voucher($db, 'bob', $call['call_id']); throw new LogicException('expired voucher minted'); }
catch (RuntimeException $e) { verify($e->getMessage() === 'call is no longer ringing', 'expired call cannot be answered'); }
call_push_register($db, 'bob', $proof, $token . 'rotated', false);
verify(call_push_tokens($db, 'bob') === [], 'registration can be revoked');
echo "All reliable-delivery backend tests passed.\n";
