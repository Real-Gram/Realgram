# Realgram ad diagnosis — 21 October 2026

Source: production AdMob API rows, date range 2026-09-21 through 2026-10-21 inclusive.
These are not rolling 24-hour totals. API revenue is estimated, not finalized payout.

| Android placement | Requests | Matched | Impressions | Revenue USD |
|---|---:|---:|---:|---:|
| Primary interstitial | 467 | 167 | 35 | 0.036693 |
| Banner | 624 | 180 | 32 | 0.011312 |
| Fallback interstitial | 279 | 51 | 2 | 0.002056 |
| Rewarded | 266 | 14 | 0 | 0 |

iOS banner: 12 requests, zero matches/impressions. Android totals: 1636 requests,
412 matches, 69 impressions, USD 0.050061 estimated revenue.

The reporting connection was restored at 2026-10-21T20:57:26Z. The old local
summary incorrectly showed zero: it read a daily backfill rather than current
AD_INTERSTITIAL_SHOWN events. The tested live helper now reports 50 locally
observed full-screen shows for that date range, kept separate from 69 API impressions.
Historical banner visibility cannot be reconstructed from loaded callbacks.

## Confirmed code defects addressed

- Native Android banner SDK impressions were not exposed to JS. Paid callbacks
  were the only banner impression signal. A version-checked, idempotent install
  patch exposes Android AdListener.onAdImpression; AD_BANNER_SHOWN is distinct
  from revenue callbacks and provider-confirmed reports.
- A pending banner retry could reload an ad after a successful load. The timer is
  now cancelled on load. Retry requests are counted. Retries follow the mounted
  banner instance, so a later SDK refresh failure can retry after an earlier success.
- A ready but stale full-screen cache entry blocked new preloads. It is now
  discarded before attempting a replacement.
- Source groups describing the same traffic are no longer added together in
  headline provider totals. Local shows are queried independently of paid events.

## What is not established

Low match-to-impression ratios do not prove every unmatched show is a bug.
Preloading without a later eligible user action contributes to the difference.
The old clients do not provide a per-request lifecycle sufficient to attribute
all missing shows. Recent errors include network failures, timeouts, no-fill and
Google SDK JavaScript engine/internal errors. This patch does not claim to cure
all network or SDK failures.

No fake impressions, forced clicks or client-created revenue were added.
Reward credits remain controlled by the existing server/provider verification.

## Validation and rollout

TypeScript passed. All 48 Jest suites / 438 tests passed. The additional banner-refresh regression and Play-update tests also passed (28 targeted checks). Six in-memory PHP
reporting checks passed. Jest reports lingering handles in the overall suite;
there were no failed assertions. Native bridge compilation/device verification
and a signed release remain separate. The live helper alone was deployed;
the website APK is unchanged.
