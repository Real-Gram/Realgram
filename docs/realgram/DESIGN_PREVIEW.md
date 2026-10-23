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
