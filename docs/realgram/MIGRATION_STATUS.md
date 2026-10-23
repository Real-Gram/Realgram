# Realgram migration — 20 October 2026

Canonical repository: https://github.com/Real-Gram/Realgram

## Source state

- Website, mobile application, Android/iOS/Windows native projects, shared
  messenger, PHP API and calling relay now belong to this repository.
- Existing Windows and SEO work was merged before importing the current mobile
  source. Windows no longer checks out a second repository to obtain app code.
- Current source and filenames use Realgram. A naming check prevents the retired
  name returning. Previous history is retained in Git.
- API: https://api.realgram.no/api.php. Call signaling target:
  wss://api.realgram.no/ws/call. The API answers, but the WebSocket route must
  be configured and verified before releasing the new client.
- Native executables are fetched from a hash-pinned build-input archive in this
  repository's Releases. They are not duplicated as large source blobs.
- Android sources/JNI namespace are com.realgram; release builds discover the
  stable installation identity from the hash-verified installed app lineage.
  Existing signing credentials must be available in this repository's CI.
- The mobile snapshot is version 0.9.150 / build 190. This is development source,
  not a published app release.

## Messaging and calls

- Request receipts deduplicate message retries, including after disappearing
  messages have been removed. The draft remains visible on failure.
- Older polling responses cannot overwrite newer message state.
- Android FCM/CallStyle and a native incoming-call screen are implemented,
  including decline/answer, expiry, cancellation and duplicate-invite handling.
- A push is validated against current backend call state before answering.
- Background calling is not active until Firebase is configured and the client,
  API and relay have been deployed and tested together.
- iOS background calling still needs PushKit/APNs + CallKit. iOS provisioning and
  installed bundle identity must be validated before its renamed target ships.

## Deployment state and remaining work

Production service directories and cron/service references have not been renamed
by this source migration. Their data and message keys must be preserved and their
dependencies verified before any live cutover; no active installation is deleted.

1. Configure the canonical API call-upgrade route and test WSS on port 443.
2. Deploy backend source under a Realgram directory, retaining the existing
   database/key through REALGRAM_DATA_DIR. The optional
   REALGRAM_PREVIOUS_MOBILE_TOKEN environment value permits installed clients
   during the transition, without keeping a retired brand literal in source.
3. Configure REALGRAM_GOOGLE_SERVICES_JSON in CI and REALGRAM_FCM_CREDENTIALS on
   the relay. Neither is in source control. Firebase must match the release
   installation identity, not merely the Java/Kotlin source namespace.
4. Transfer the existing release signer into the canonical repo's CI settings,
   then build and test on two real Android phones before publication.
5. Rename active service/root directories together with their nginx, cron,
   process manager and backup references, verify and retire compatibility routes.

## Verification

The migrated mobile source passed all 46 Jest suites / 433 tests, plus the account-state migration test. Relay tests
cover voucher validation, presence and FCM sender behavior. PHP delivery tests
use an isolated temporary folder and in-memory SQLite, not production data.
The first Android CI run exposed an obsolete SDK tools package in the imported
workflow; the workflow now explicitly installs platform-tools and Android 34.
Android native compilation and device validation remain separate checks.
The live website download links and version metadata now use realgram.no only,
pointing to the verified 0.9.149 download. Other live SEO edits were preserved.

## 20 October Android on-device preview

The website offers a CI-built, debug-signed Android 0.9.150 preview (arm64)
from the canonical Realgram repository. Its Android package com.realgram is
different from the installed production 0.9.149 package. It is a separate test
installation, not an upgrade, and FCM background calling remains unavailable.
The signed production APK remains v0.9.149 until the original release-signing
secrets are migrated to this repository and the backend is ready.

The site Android production button now uses the permanent local URL
/download/RealGram-latest.apk and reads /download/version.json for the
current signed release. The independent preview button points directly at a
checksum-verified APK on realgram.no. No user needs GitHub login or a ZIP to
install either Android build.

## 21 October advertising and Play preparation

AdMob API reporting was reconnected. The updated monetization helper reads
current local shown callbacks without waiting for a backfill. Android banner
source adds a pinned native impression callback independent of paid events.
Loaded banners are not counted as shown. Pending retries are cancelled when a
banner loads successfully; stale full-screen cache entries can be replaced.

Play AAB workflow and API 36 tooling are prepared. Original signer/Firebase
secrets, verified background calls, Play Console authentication and listing
declarations remain publication blockers. See PLAY_RELEASE.md. Source/JS tests
do not establish a signed release, native compatibility or store approval.


Final verification for the advertising/Play preparation:
Android API 36 debug compilation succeeded in Actions run 39676963651.
The native-source snapshot was 9442d7d; later JS/backend changes passed
48 suites / 439 tests plus relay/backend validation in run 39678346175 at d29fa62.
The debug artifact was retained for validation only; no website update or
Google Play submission was performed. Original signer/Firebase secrets,
physical background-call tests and Console declarations remain outstanding.

## Messenger-first release — 22 October 2026

The isolated `feat/realgram-messenger-first-20261022` branch builds on the current
ads/Play preparation branch, preserving its parallel work. It opens into Chats,
retains calls, connection tools and clan invitations, replaces the game-dependent
profile, and removes game/payment screens from navigation and the JS import graph.
Audio calling no longer requires a premium plan. No live deployment or production
APK publication is implied. See MESSENGER_RELEASE.md and
IMO_CONNECTIVITY_2026-10-22.md for scope, measured evidence and outstanding phone/
network tests. Existing Firebase, signing and background-call gates still apply.

Production check on 22 October: the public WSS upgrade succeeds, but the API
rejects the canonical client's identifier with `invalid token`. Matching backend
activation and installed-client compatibility remain mandatory before publishing.
See IMO_CONNECTIVITY_2026-10-22.md. No production auth/database change was made.

Messenger implementation verification: Android debug native build passed in
Actions run 39835217291 (834775f). The final Settings footer cleanup also passes
TypeScript and production JS bundling. Source tests: 49 suites / 444 tests and
75 calling assertions. Production API auth, phone/network tests and signed Play
publication remain outstanding; see MESSENGER_RELEASE.md for exact build refs.

## Design APK authorized — 23 October 2026

The user now requests an immediate APK specifically to review the new design,
with live API/calling fixes deferred. A separately installed Realgram Design
preview uses the real new UI with labeled offline example data and no account
registration. The stable release and its signing/background-call gates remain.
See DESIGN_PREVIEW.md for build and publication checks.

### Design APK published — 23 October 2026

The explicitly requested design-only APK 0.9.151-design is now live at
https://realgram.no/download/Realgram-0.9.151-design-arm64.apk and linked from
both homepages. Build 39882450720 passed; public download size/hash was verified
from another machine. Package com.realgram.design installs separately as
Realgram Design and opens actual messenger screens with offline examples.
Stable APK 0.9.149/code 189 and its hash/version metadata remain unchanged.
See DESIGN_PREVIEW.md for source SHA, artifact checksum and validation limits.

## Gold After Dark HTML review — 23 October 2026

The user approved the gold/dark concept and requested a browser version before
another APK. The HTML playground is published at https://setai.no/realgram/ as an
explicit user-requested review-host exception. Source, approved concept image,
design tokens and Claude handoff are under web-preview/realgram and docs/design.
GitHub writes are currently blocked by integration permission (403), with the
authenticated VPS devices offline. This records local/prepared source, not a push.
See docs/design/WEB_PREVIEW_STATUS.md for verified behavior and pending checks.
