# Realgram Google Play preparation — 21 October 2026

## Verified blockers

- No Actions secrets are configured in Real-Gram/Realgram as of this check.
- Stable app: 0.9.149. The 0.9.150 preview is a separate debug-signed installation.
- Original release signer, installed package identity and Firebase configuration must be preserved.
- Incoming background calls still need FCM credentials, deployed WSS and two-phone verification.
- Play Console is not authenticated in this publishing session. Existing listing/package, account type and production eligibility are unverified.
- API 34 was below current Play submission requirements. This change prepares API 36, AGP 8.9.1 and Gradle 8.11.1; native build/device validation is still required.

## Verified build results

Android API 36 debug compilation passed, including the native ad bridge:
https://github.com/Real-Gram/Realgram/actions/runs/39676963651 (9442d7d).
Final app/backend validation passed: 48 app suites / 439 tests, four calling
relay checks and backend checks including seven ad-reporting assertions:
https://github.com/Real-Gram/Realgram/actions/runs/39678346175 (d29fa62).

A debug build is not a signed production AAB. Physical background-call testing,
the Play-specific release manifest and the signed bundle still require validation.

## Bundle workflow

First integrate the reviewed changes, including the workflow, into the default
branch. A new workflow must exist there before GitHub exposes manual dispatch.
Then use Actions → Release Google Play Bundle on the reviewed release branch. It produces a
signed AAB without deploying the website or submitting a release to Google.
It retains the installed-package identity and background-calling release gates.
Do not create a replacement signing key: Play App Signing must preserve update
compatibility with the existing website APK.

Required secrets: original RELEASE_KEYSTORE_BASE64, RELEASE_STORE_PASSWORD,
RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD, REALGRAM_GOOGLE_SERVICES_JSON.
Set REALGRAM_BACKGROUND_CALL_E2E_VERIFIED=yes only after actual two-phone testing.

The Play build uses -PrealgramPlayBuild=true and removes REQUEST_INSTALL_PACKAGES.
Its JS and native bridge disable website APK updates. Website builds retain them.

Store text files are prepared in store/google-play/en-US and store/google-play/nb-NO.

## Store listing draft

Name: Realgram
Short description: Messaging and VPN access in one app.

Full description draft:
Realgram brings messaging and VPN connection tools together in one Android app.
Manage your profile, exchange messages and choose a VPN connection from a single
interface. Free access may contain advertising.

Finalize claims against the tested production version. Background calling,
video calling, end-to-end encryption and unlimited access are not verified here.

## Console work after authentication

1. Inspect the existing developer account/listing before creating another app.
2. Verify original package, version code and signing certificate.
3. Add real screenshots, verified support contact and public privacy-policy URL.
4. Complete Data safety from actual AdMob, diagnostic, profile, messaging,
   microphone/camera and VPN data flows. Account deletion/public deletion page
   remain unverified.
5. Verify EEA/UK/Swiss consent; non-personalized requests alone are not proof of consent.
6. Review VPNService, foreground services and full-screen calling declarations.
7. Review Play billing for enabled payment flows, plus TV rights and UGC moderation.
8. Upload the signed AAB to an appropriate test track; resolve pre-launch findings.
9. Confirm any personal-account closed-test requirement in Console. Where applicable,
   Google requires 12 opted-in testers continuously for 14 days before production access.
10. Link the supported-store listing back into AdMob after approval.

These are publication prerequisites, not a claim of Google approval.

## Official sources

- https://support.google.com/googleplay/android-developer/answer/11926878
- https://developer.android.com/build/releases/about-agp
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://developer.android.com/guide/practices/page-sizes

Every native dependency/executable also needs a 16 KB compatibility check.
Increasing targetSdk alone does not establish native compatibility.

## Messenger-only scope update — 22 October 2026

First release now excludes Shahnameh/game access, game earning, wallet and payment
screens. Clan is retained for invitations. New UI and release boundaries are in
MESSENGER_RELEASE.md; the updated store drafts must be checked against the final
signed build. Core messaging/audio calling is free and ad-funded. Do not claim
universal no-VPN connectivity or verified background calling before field tests.
Billing and live-TV declarations are not needed for those disabled surfaces;
permission, data, consent and UGC checks for the actual remaining app still apply.

Production check on 22 October: the public WSS upgrade succeeds, but the API
rejects the canonical client's identifier with `invalid token`. Matching backend
activation and installed-client compatibility remain mandatory before publishing.
See IMO_CONNECTIVITY_2026-10-22.md. No production auth/database change was made.
