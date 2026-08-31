# calling-relay

**Repo sync note (2026-08-31):** this code was added here from a live,
previously-unversioned copy at `/home/ubuntu/SetaLink/calling-relay` on
`5.249.252.88` (pm2 process `calling-relay`) — that box's copy had drifted
ahead of any source control (this commit is the first time it's tracked
anywhere). Known live/doc gap as of this date: this file's "Status" section
below says signaling is proxied at `wss://vpn.setalink.no/ws/call`, which is
true on `5.249.252.221`'s deployment (vhost `calling-relay-ws` there) but
**not currently true on `.88`** — `.88`'s `vpn-setalink` nginx vhost only
proxies the VPN transport paths (`/ws`, `/xhttp/`, `/httpup`), nothing routes
`/ws/call` to this service's port 8095 there yet. See `XS227/SetaLink#17`
and `docs/realgram/TASK_SPLIT.md` in this repo for the open question on
where calling-relay's public route should live post-rebrand.

Stateless WebRTC signaling relay for RealGram audio calling. Holds no
database — `lib/calling.php` (in the SetaLink PHP backend) is the source of
truth for whether a call is allowed to exist; this process only routes
signaling messages between two voucher-authenticated sockets.

## Status (2026-07-30)

- `voucher.js` — done, tested (`test-voucher.js`, 10/10 passing, including a
  fixture verifying a real PHP-signed voucher decodes correctly here).
- `presence.js` — done, tested (`test-presence.js`, 15/15 passing).
- `server.js` — **running live** (pm2 `calling-relay`, `ws` installed,
  proxied via nginx at `wss://vpn.setalink.no/ws/call`).
- 2026-07-30: Khabat + Iran tester real-call test on APK 114 — calls placed
  fine over REST (initiate/accept both 200) but audio never came through,
  or the call never rang at all. `nginx` access.log showed `/ws/call`
  upgrades dying after 24–1132 bytes, repeatedly, over the ~20min test
  window. Root cause: no ping/pong heartbeat, so a NAT/carrier/DPI box
  silently black-holing an idle connection (very plausible on the Iran
  side specifically) went undetected — the socket looked OPEN locally
  while every signaling frame sent into it vanished. Fixed: server now
  pings every 30s and terminates anything that doesn't pong, so the
  client's existing reconnect-with-backoff kicks in fast instead of
  sitting on a dead pipe. No client change needed for this part — pong
  response is automatic at the WebSocket protocol level.
  Also fixed a related client-side bug (`callSignalingClient.ts`
  `placeCall`/`joinAsCallee`): the `call:join` voucher send used a stale
  "socket was open when this method started" check, so if the WS dropped
  during the `call-initiate`/`call-callee-voucher` HTTP round-trip, the
  join silently never happened even though the REST call reported
  success — connects/rings with nobody actually in the signaling room.
  Needs a new app build to take effect (not live in APK 114).
  **Still open / worth checking before the next test round:** the relay's
  public hostname is `vpn.setalink.no` — literally containing "vpn" in the
  SNI is a known red flag for the exact kind of DPI this whole product
  exists to route around, and could explain intermittent total
  connection failures on the Iran side independent of the heartbeat fix.
  Not changed here (would need a new cert SAN + hostname + app build);
  flagged for Khabat to decide on.

## Running

```
npm install
CALLING_RELAY_SECRET=<same value as SetaLink's calling.relay_secret setting> \
CALLING_RELAY_INTERNAL_SECRET=<random, only shared with the PHP side> \
CALLING_RELAY_PORT=8095 \
CALLING_RELAY_INTERNAL_PORT=8096 \
npm start
```

`CALLING_RELAY_PORT` is the one nginx should reverse-proxy to (public
`wss://` path). `CALLING_RELAY_INTERNAL_PORT` must never be nginx-proxied —
it's how PHP pushes `call:incoming` to an already-connected device and is
protected only by `CALLING_RELAY_INTERNAL_SECRET`, not a voucher.

Both secrets need to land in SetaLink's `calling` service-config row (see
`call_service_config()` in `lib/calling.php`) so PHP mints vouchers the
relay will actually accept.

## Why two secrets

- `CALLING_RELAY_SECRET` signs/verifies per-connection **vouchers**
  (presence tokens, caller/callee call vouchers) — these are handed to the
  mobile app and travel over the public WS connection.
- `CALLING_RELAY_INTERNAL_SECRET` guards the internal push hook that only
  PHP calls, on a port that's never exposed publicly. Keeping it separate
  means a leaked voucher secret (e.g. via a compromised app binary, since
  vouchers are inherently client-visible) doesn't also grant push access.
