<?php
/** FCM registrations use the existing short-lived, device-bound presence voucher.
 * No message bodies, SDP, credentials or push tokens are exposed to peers. */
function call_push_ensure_schema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS call_push_tokens (
        token TEXT PRIMARY KEY, device_id TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_call_push_device ON call_push_tokens(device_id)');
}
function call_push_register(PDO $pdo, string $deviceId, string $voucher, string $token, bool $enabled): void {
    call_ensure_schema($pdo);
    $cfg = call_service_config($pdo);
    $proof = call_verify_voucher($cfg['relay_secret'], $voucher);
    $device = qe_fetch_device($pdo, $deviceId);
    if (!$device || !empty($device['blocked']) || !$proof || ($proof['role'] ?? '') !== 'presence'
        || ($proof['device_id'] ?? '') !== $deviceId) throw new RuntimeException('invalid device proof');
    if (strlen($token) < 20 || strlen($token) > 4096 || preg_match('/\s/', $token)) {
        throw new RuntimeException('invalid push token');
    }
    if (!$enabled) {
        $pdo->prepare('DELETE FROM call_push_tokens WHERE token=? AND device_id=?')->execute([$token, $deviceId]);
        return;
    }
    $pdo->prepare("INSERT INTO call_push_tokens(token, device_id) VALUES (?,?)
        ON CONFLICT(token) DO UPDATE SET device_id=excluded.device_id, updated_at=datetime('now')")
        ->execute([$token, $deviceId]);
    // A device identity represents one installation; token rotation replaces it.
    $pdo->prepare('DELETE FROM call_push_tokens WHERE device_id=? AND token<>?')->execute([$deviceId, $token]);
}
function call_push_tokens(PDO $pdo, string $deviceId): array {
    $st = $pdo->prepare("SELECT token FROM call_push_tokens WHERE device_id=? AND updated_at > datetime('now','-60 days') LIMIT 1");
    $st->execute([$deviceId]);
    return $st->fetchAll(PDO::FETCH_COLUMN);
}
/** Validate on resume: an expired/cancelled/wrong-device push cannot open a call. */
function call_pending(PDO $pdo, string $deviceId): ?array {
    call_ensure_schema($pdo);
    $call = call_active_for($pdo, $deviceId);
    if (!$call || $call['callee_device'] !== $deviceId || $call['status'] !== 'ringing') return null;
    $device = qe_fetch_device($pdo, $deviceId);
    if (!$device || !empty($device['blocked']) || dm_is_blocked($pdo, $call['caller_device'], $deviceId)) return null;
    return [
        'call_id' => $call['call_id'], 'caller_user_id' => $call['caller_user_id'] ?: $call['caller_device'],
        'kind' => $call['kind'], 'expires_at' => strtotime($call['started_at'] . ' UTC') + CALL_STALE_RINGING_SECS,
    ];
}
