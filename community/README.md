# Realgram Live Lounge

The user requested a shared public chat room that does not require friends or
invitations. This is a real server-backed guest room, separate from private DMs.

Endpoint: `https://realgram.no/community/room.php?action=...`.
POST `join` with a display name returns a random 24-hour guest bearer token and
public guest ID. Only the SHA-256 token hash is stored. Guest names are explicitly
unverified. GET `messages` and POST `send`, `delete`, `report` require that bearer
in the Authorization header. CORS is deliberately public, without cookies or
private account credentials. HTTPS is required by the clients.

Messages are plain text, 1–500 Unicode characters. The browser escapes all text
before rendering it. Sender identity comes from the bearer session, never from
the posted name or ID. Send retries reuse a client message ID and are idempotent.
Own deletion propagates through full bounded snapshots. Anyone may report a
message; hiding a guest is local to the viewer. Reports are retained for operator
review in SQLite, not automatically treated as proof or silently deleted.

Rate limits: six joins per IP per minute, 20 messages per guest/minute, a two-second
minimum message gap, 40 messages per source IP/minute, ten reports per guest/minute.
The server uses salted IP HMACs rather than raw IP storage. Existing web-server
access logs are separate. `active_recently` counts sessions seen within 45 seconds,
not a fabricated online count. The UI polls every 3.5 seconds while visible and
stops polling when hidden or outside the lounge.

SQLite lives outside the document root at `/var/lib/realgram-community/room.sqlite`.
Provision the directory as `www-data:www-data`, mode 750. WAL, prepared statements,
busy timeout and immediate transactions protect rate checks and writes. Override
the path with REALGRAM_ROOM_DB for disposable tests. Never commit/upload the DB.
Recent messages/reports retain up to seven days, messages cap at 10,000, and
expired sessions are pruned opportunistically after the message retention window.

Deploy only Room.php and room.php into `/var/www/realgram/community`. The scoped
`infra/nginx/realgram-community.conf` runs only the exact API entry point through
the existing PHP 8.1 FPM pool; other community paths are 404. Include the snippet
in the realgram.no TLS server. Validate nginx configuration before reloading.
No existing account, auth identifier, private-message DB or calling backend changes.

Validation: `php community/test-room.php` (23 checks) and
`python3 community/test-http.py` (disposable loopback server, two guests). The
public endpoint was additionally checked for guest join/authenticated read.
No test message was posted into the public production room.

For operator review use a read-only SQLite connection to inspect the reports
table joined to messages; the room does not expose an unauthenticated admin API.
Connecting this guest pilot to the real account/moderation system is later work.
