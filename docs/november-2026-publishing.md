# November 2026 publishing
Four reviewed bilingual articles are in .editorial/november-2026.json and stored as private MongoDB drafts.
Publish on 3, 10, 17 and 24 November at 08:00 Europe/Berlin (07:00 UTC), one English/Persian pair per date.

The existing generator cron was replaced, with all other jobs preserved:
    */15 * * * * cd /var/www/realgram && /usr/bin/flock -n /var/lib/realgram-blog/publish.lock /usr/bin/node scripts/scheduled-blog.cjs publish >> scripts/generate-blog.cron.log 2>&1

The publisher uses actual current time and regenerates blog pages and sitemap on every run. It preserves existing publication dates and editor changes. The --at option is allowed only for non-writing dry-run. Status: /var/lib/realgram-blog/status.json, outside the web root. The existing Nginx dot-path rule protects the queue.

Commands:
- node scripts/scheduled-blog.cjs prepare
- node scripts/scheduled-blog.cjs status
- node scripts/scheduled-blog.cjs dry-run --at=2026-11-03T07:00:00Z
- node tests/scheduled-blog.cjs

A bounded four-run ChatGPT automation checks each November publication.
Validated 20 October: eight private drafts; draft API URLs 404; hidden queue 403; one active publisher cron; public blog remains 13 posts per language. Isolated database tests passed for no early publication, date boundaries, language pairs, duplicate retries and preserving editor changes.
