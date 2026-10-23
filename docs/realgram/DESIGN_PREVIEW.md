# Realgram design preview — 23 October 2026

The user explicitly requested a new APK to test the updated design now, with API,
background calling and production activation deferred. This supersedes the prior
requirement to wait for those features **for this design-only test build**.

- Android display name: Realgram Design.
- Separate application id: com.realgram.design. Existing stable/previous preview
  installations are not replaced, and no production signing key is substituted.
- Version: 0.9.151-design. CI uses its monotonic debug version code and cached
  debug signer. Do not use this APK for a Play release.
- The app opens directly into the new messenger layout with labeled example data:
  Chats (including local message composition), Calls, Connection, Clan, Profile.
- It uses the actual new screen components. Profile naming, navigation, invitation
  list and four existing language choices can be reviewed without authentication.
- Preview transport answers supported actions in memory; unknown actions fail
  locally. Calling and VPN actions show a preview notice. Ads are placeholders.
- Preview storage stays in memory, and examples reset after restarting. No existing
  messages, account data or release installation are read or modified.
- Normal app builds have IS_DESIGN_PREVIEW=false. Gradle checks the JS/native
  settings agree and allows preview only as a separate debug variant; release
  variants are excluded. The existing signed-release/background-call gates stay.

Build: dispatch Android Debug APK with design_preview=true from this branch.
The workflow sets the preview flag/version in the build workspace only, skips
Firebase config, bundles JS in the APK and adds the .design application id suffix.

Publication target:
https://realgram.no/download/Realgram-0.9.151-design-arm64.apk
Homepage preview links (English/Persian) are updated only after artifact
verification. Stable RealGram-latest.apk and version.json are preserved.

Validation: full mobile suite 51 suites / 446 assertions passes, including offline
fixture transport and production-boundary tests. TypeScript and a production JS
bundle with preview enabled are checked separately. Native compilation, APK
package/version/signer and public download checks must complete before publication.

Published and verified on 23 October 2026:
- Source: ced626bf87b24d7d3a99aa3583026294e0664932, canonical PR #6.
- Android build: https://github.com/Real-Gram/Realgram/actions/runs/39882450720
  succeeded, including APK package, version, app label, signer and embedded bundle checks.
- Public APK: https://realgram.no/download/Realgram-0.9.151-design-arm64.apk
- Download size: 63,853,072 bytes. SHA-256:
  41012324b63388ba9b323b9f8c5f70a8b3b55b13a397f266707d6d8ed312f423
- Debug certificate SHA-256:
  8022fb17183db497ef80581b28d45e32c1a3d421d034a50f3674ae6d6de34527
- Downloaded again from the public URL on a separate authorized machine: HTTP 200,
  matching size/hash. English and Persian homepages both link this APK.
- The stable latest APK and version.json remain at 0.9.149/code 189. Stable APK
  SHA-256 remains 2abb5698098e3e243f9ad2acd6e92fad6bd7f35ad1f3d5da0d954fec74ec0a09.
- No physical-device install/launch claim is made. This build is ready for the
  user's design review; live API/background-call activation remains separate.
