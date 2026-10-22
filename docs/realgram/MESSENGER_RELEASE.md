# First messenger release — 22 October 2026

Canonical source: https://github.com/Real-Gram/Realgram
Working branch: `feat/realgram-messenger-first-20261022`
Based on `fix/realgram-ads-play-20261021` at `6931283`, preserving that branch's
AdMob reporting corrections, API 36 preparation and background-call release gates.
This branch does not overwrite a live server working tree.

## Release behavior

- Opens into Chats. Footer: Chats, Calls, Connection, Clan, Profile.
- Familiar messenger layout, round avatars, blue accents, dark translucent
  surfaces and restrained gold for the invitation code. Original Realgram assets.
- Four existing app languages retained; new strings are translated in English,
  Persian, Chinese and Russian. Persian uses RTL text/footer ordering.
- Profile uses the existing device/messenger identity and cached avatar; it does
  not wait for player stats or the game profile service. Display-name edits use
  the existing profile synchronization path. Account recovery remains in Settings.
- Clan is the invitation network: share the actual code/link and list invited
  friends, with a retry state if the list is unavailable. No invented game guilds,
  treasury, cash prizes or monetary rewards are shown there.
- Audio calls have no premium-plan requirement in the UI or backend. Existing
  blocks, rate limits, identity checks and deployment allowlists remain enforced.
  Video's controlled rollout is unchanged; public video calling is not claimed.
- Calls tab reads the existing server call history and can start an audio callback.
- No payment, purchase, wallet, token trading, game/chapters/heroes, luck wheel or
  game-earning screens are registered. Import-graph validation also prevents those
  screens and the game WebView from entering the messenger JS bundle.
- No existing account, quota, message key or game-progress records are deleted.
  Deferred source remains in Git for a later optional game release.

## Ads and free access

Banner placements fund the app. Extra connection data uses the existing voluntary
Watch ad action and server-side reward verification. No ad is required to open a
conversation, answer a call or view Profile/Clan. There is no purchase fallback.
Connection quota and pre-existing account entitlements remain server-authoritative;
this is not a promise of unlimited VPN data.

Automatic full-screen advertisements on launch/foreground are removed from the
messenger lifecycle. Ads never appear in the native incoming-call screen. Test ads
must be used for QA. Consent integration and the production AdMob account still
need the release review described in PLAY_RELEASE.md.

Google's rewarded-ad policy requires explicit opt-in, dismissibility, and normal
usage after declining; rewards must not be cash or cryptocurrency:
https://support.google.com/admob/answer/7313578

## Connectivity evidence

See IMO_CONNECTIVITY_2026-10-22.md for the inspected official APK, checksums,
observed client symbols, inference limits and same-network test matrix.
`calling_turn_tls_url` adds an optional verified TLS/443 TURN path; no live TURN
configuration is changed by the source commit. Network probes do not prove media,
push delivery, active-call handover or operation on Iranian mobile networks.

## Release status

Source implementation is prepared for review. This is not a production APK/AAB,
a Play submission, a live backend deployment or a passed two-phone call test.
Keep original Android installation identity, signer and background-call gates.
Before a Play release: integrate reviewed changes, configure matching Firebase/
relay credentials and TURN, test background ringing on two phones, build the signed
Play AAB, and complete actual screenshots, consent, Data safety, deletion and UGC
moderation verification. The signed build workflow remains gated on those call
checks; do not bypass it to ship the redesign.

## Validation

- TypeScript check passes; all 49 mobile test suites / 444 tests pass.
- Added regressions cover free-plan call callbacks, game/payment route rejection,
  offline profile editing and clan invitation sharing/retry.
- All 75 backend calling checks pass in an isolated temporary directory with an
  in-memory SQLite database, including free callers, retained abuse guards and
  optional TLS TURN validation. No production database is used.
- Naming and app import-graph checks pass. Android native/build and physical
  device verification are tracked separately from these source checks.
- The full Jest run reports an existing worker-shutdown/timer warning; all test
  assertions pass. Focused new messenger tests exit cleanly.
