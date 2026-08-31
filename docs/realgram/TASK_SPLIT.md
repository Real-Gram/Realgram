# RealGram infra migration + rebrand — task split

Tracking issue: [`XS227/SetaLink#17`](https://github.com/XS227/SetaLink/issues/17) — status updates should still be posted there until it's closed, since that's where Khabat and other agents are watching. This file is the working task list; the issue is the human-facing status feed. Keep both in sync (pattern borrowed from `XS227-BIAP/PROJECT_STATUS.md`).

**Repo direction (2026-08-31):** `Real-Gram/Realgram` is now the canonical repo going forward. `XS227/SetaLink` is being retired as a name — new work (code, and eventually infra naming) should not introduce new "setalink" references.

## Two boxes involved

| Box | Hostname | Role today |
|---|---|---|
| `5.249.252.221` | `vps-5348441` (Uniweb, 1 vCPU/1GB RAM) | Current prod: setalink.no website (nginx+PHP-FPM), `data/analytics.db`, its own Xray/VPN exit node, calling-relay, Nasrin's BIAP Expo tunnel, cron jobs. RAM upgrade stuck since 2026-08-25 (no Uniweb API/CLI access) — this is *why* we're moving off it. |
| `5.249.252.88` | `vps-5359843` | Target box. Already runs: `desktop.realgram.no` (frontend + pm2 backend), a **second, independent** Xray/VPN edge on `vpn.setalink.no`, `calling-relay`, and unrelated `biap-fin.service`. |

Whoever is running an agent session on a given box should work the rows below that say "access needed: that box" — cross-box file transfers need explicit coordination (ssh key exchange or a human-run `scp`), don't assume one agent can reach the other box directly.

## Work item A — finish moving `.221` → `.88`

Access needed: **`.221`** for export steps, **`.88`** to receive.

- [x] **Export `data/analytics.db`** — schema/size confirmed 2026-08-31 (from `.221`): 9.3MB, 101 tables, 194 rows in `devices`, 22,622 in `app_events`. Small enough for a straight `scp` + point the service at the copy, no migration tooling needed. Not yet actually copied to `.88` — next step for whoever has write access on `.88`'s end.
- [ ] Inventory `.221`'s nginx+PHP-FPM setalink.no site (webroot `/var/www/setalink`) — decide with Khabat whether the public site itself moves as-is, gets folded into `realgram.no`, or is retired (this is a branding call, not a pure infra one — don't decide unilaterally). **Inventory done 2026-08-31:** `sites-enabled/` on `.221` has `api.setalink.no`, `setalink-landing` (the main site), `calling-relay-ws`, `default` — plus, worth flagging, **`app.dadashi.no`** (Dr. Nasrin Dadashi's own unrelated site, also hosted on this box — needs its own decision if `.221` gets decommissioned, out of scope for this migration otherwise). PHP-FPM: single pool, `www.conf`.
- [x] **Inventory `.221`'s own Xray/VPN exit node config — DONE, with a clear recommendation.** `.221` runs a live `xray.service` (systemd, active) with the *identical* inbound layout to `.88`'s edge: `vless` on `ws:10000` / `xhttp:10001` / `httpupgrade:10002`, plus a Reality inbound on `:8443` decoy-SNI'd as `www.cloudflare.com`/`www.microsoft.com`. nginx's own `stream{}` map on `.221` still has a `vpn.setalink.no → 127.0.0.1:4434` entry too. **But it's very likely dead:** `dig vpn.setalink.no` already resolves to `5.249.252.88`, not `.221`, so no real traffic reaches `.221`'s copy of that SNI; it's also not registered under any node id in `public/v1.php` (checked every node's `address` field — no match for `5.249.252.221`), so the app's server list never hands it out either. `/var/log/xray/access.log` for the last ~1.5h shows *zero* connections on the ws/xhttp/httpup/reality inbounds — the only entries are `.221`'s own internal health-check pinging `api` on `127.0.0.1:8344` every 5 minutes. Recommendation: this looks like orphaned infra (maybe a predecessor of `.88`'s edge, or a same-box test that was never fully decommissioned) that's safe to shut down — but per the guardrail below, that's Khabat's call, not made here.
- [x] **Inventory the node-health / real-ssh-worker cron jobs — DONE, and there's more than the plan named.** Found via `crontab -l` (root) + `/etc/cron.d/` + `systemctl list-timers`, all on `.221`:
  - Root crontab (all critical to the live VPN service, all currently only running on `.221`):
    - `*/5 * * * *` — `poll-traffic.sh` (xray traffic stats)
    - `*/2 * * * *` — `parse-last-seen.sh` (device `last_seen_at` from access log)
    - `*/2 * * * *` — `scripts/export-xray-stats.sh` (admin-dashboard xray stats)
    - `*/2 * * * *` — `scripts/check-node-health.sh` (writes `data/node_health.json` — this is the one the plan named)
    - `*/10 * * * *` — `scripts/update-real-rate.php` (REAL/USD rate for premium pricing)
    - `0 5 * * *` — `scripts/sync-adsgram-daily.php` (AdsGram revenue sync)
  - `/etc/cron.d/` (ubuntu user):
    - `* * * * *` — `real-ssh-worker.php` (the one the plan named — drains `real_ssh_devices` queue into `authorized_keys`)
    - `* * * * *` — `vps-helper-worker.php` (drains `vps_helpers` queue)
    - `17 6 * * *` — `gsc_cron.php` (daily Search Console → keyword_ranks sync)
  - systemd timer: `setalink-watchdog.timer` (fires every ~1 min, `setalink-watchdog.service`)
  - None of these have been recreated on `.88` yet — whoever has `.88` access needs to check which are already superseded there (e.g. `.88` almost certainly needs its own node-health probe once it's carrying real traffic) vs. which need a straight port.
- [x] **Confirm Nasrin's BIAP Expo tunnel status — DONE.** Still actively running on `.221` (`ps aux` shows `expo start --tunnel --clear` + the ngrok helper process, started 2026-08-25, PM2-managed under the `nasrin` user) — **not** moved to `.88`. Do not touch/kill it here.

## Work item B — rebrand `vpn.setalink.no` → realgram-branded domain

Access needed: **`.88`** only — this edge (nginx stream SNI router + Xray) lives entirely there. Do **not** start this until Work item A's exit-node inventory above clarifies whether `.221` has a competing/duplicate edge that also needs folding in first.

Current setup on `.88` (confirmed 2026-08-31):
- Public `:443` is a single nginx `stream{}` block in `/etc/nginx/nginx.conf` that SNI-routes by `$ssl_preread_server_name`:
  - `www.cloudflare.com` / `www.microsoft.com` → `127.0.0.1:8443` (Xray Reality inbound — this is SNI-masquerading for censorship resistance, **not** the "setalink" brand; leave these serverNames alone, they're decoys, not the product name)
  - `vpn.setalink.no` → `127.0.0.1:4434` (nginx TLS termination, vhost `/etc/nginx/sites-available/vpn-setalink`) → proxies `/ws`, `/xhttp/`, `/httpup` to loopback Xray inbounds on `10000`/`10001`/`10002`
  - `default` → `127.0.0.1:4430` (the shared vhost port other sites use)
- Real users' client configs for the WS/XHTTP/HTTPUpgrade transports hardcode `vpn.setalink.no` as the TLS SNI + cert domain. **Renaming this in place breaks every distributed client config the moment DNS/cert changes** — this must be a parallel cutover, never an in-place rename.

Proposed sequence (none of this touches the live domain until the last step):

1. **Pick the new domain.** Suggest `vpn.realgram.no` (matches `desktop.realgram.no`'s pattern, same `realgram.no` zone already proven controllable — `desktop.realgram.no`'s A record was added there previously). Confirm with Khabat before provisioning — not an agent's call to make alone.
2. Add a DNS A record for the new domain → `5.249.252.88` (same IP as today; this alone changes nothing for existing users).
3. `certbot` a new cert for the new domain (standalone, doesn't touch the existing `vpn.setalink.no` cert).
4. Add a **new** nginx `server{}` block on `127.0.0.1:4434` with `server_name <new-domain>` and the new cert, proxying to the same `/ws`, `/xhttp/`, `/httpup` loopback targets as the existing block (nginx picks the right block via SNI at that port — no port change needed).
5. Add one line to the `stream{}` map in `nginx.conf`: `<new-domain>  127.0.0.1:4434;`. `nginx -t && systemctl reload nginx`.
6. Verify end-to-end with a **test** client config pointed at the new domain, alongside existing `vpn.setalink.no` clients still connecting normally — both must work simultaneously before anything else moves.
7. Start issuing the new domain in configs for **new** users/devices only. Existing users stay on `vpn.setalink.no` until they get an updated config (in-app update, or manual instruction — depends on how RealGram's client currently distributes VPN configs; check the app/`Real-Gram/Realgram` client code for a subscription/update mechanism before assuming manual re-entry is the only path).
8. Sunset window: watch traffic/logs on the old domain's SNI. Once it's near zero for a safe window (propose ≥2–4 weeks, confirm with Khabat), remove the old nginx `server{}` block, the `vpn.setalink.no` line from the `stream{}` map, let the old cert expire (or `certbot delete`), and drop the DNS record.
9. Only after step 8 is `vpn.setalink.no` actually gone from this box — that's when the rebrand is complete, not before.

## Guardrails

- Nothing in Work item B touches a live client-facing domain before step 6's parallel verification passes. If in doubt, stop and post status to issue #17 rather than guessing.
- `.221` is live prod with real Iranian users depending on its VPN tunnel — no destructive action there (service stops, file deletes, cron removal) without Khabat's explicit go-ahead in the issue or directly.
- Keep this file and issue #17 updated as steps complete — the next agent picking this up should be able to `git pull` this repo and read the issue rather than re-discovering state from scratch.
