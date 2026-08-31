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

- [ ] Export `data/analytics.db` (SQLite — devices, app_events, settings, quota_economy) from `.221`, hand off to `.88`. Confirm schema/size first; this may just be a straight `scp` + service pointed at the copy.
- [ ] Inventory `.221`'s nginx+PHP-FPM setalink.no site (webroot `/var/www/setalink`) — decide with Khabat whether the public site itself moves as-is, gets folded into `realgram.no`, or is retired (this is a branding call, not a pure infra one — don't decide unilaterally).
- [ ] Inventory `.221`'s **own** Xray/VPN exit node config (the issue body says `.221` has "Xray/VPN service config for this box's own exit node" — this is a *third*, so-far-undocumented exit node, distinct from the one already running on `.88`). Get its server_names/ports/cert domain and figure out: is it being merged into `.88`'s edge, kept as a second exit node under a new name, or decommissioned? Needs Khabat's call before touching it.
- [ ] Inventory the node-health / real-ssh-worker cron jobs on `.221` (`crontab -l`, `/etc/cron.d/`) and recreate equivalents on `.88` (or confirm they're superseded by something already running there).
- [ ] Confirm whether Nasrin's BIAP Expo tunnel needs to keep running on `.221` or has already fully moved to `.88` per [[biap-realgram-project]] — don't kill it on `.221` until confirmed redundant.

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
