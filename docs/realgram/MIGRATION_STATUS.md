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
