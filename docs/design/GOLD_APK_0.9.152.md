# Gold After Dark APK and Live Lounge — 23 October 2026

The user explicitly authorized a new APK with the approved gold theme, then
requested a live room that anyone can join without friends or invitations.
This supersedes the earlier instruction to stop at HTML review for this build.

The design APK is version **0.9.152-gold**, package **com.realgram.design**, label
**Realgram Design**. It upgrades the previous design preview if its cached signer
is retained. Dispatch the Android Debug APK workflow on the existing
`feat/realgram-design-preview-20261023` branch with design_preview=true, so the
same branch's cached debug key is available. Verification rejects any signer
different from the 0.9.151 certificate. The gold feature branch is also retained
as the design/handoff source. Never replace the stable production APK or signer.

## What is in the APK

- A self-contained HTML document, generated from `web-preview/realgram` and bundled
  in the JS package, rendered in the existing react-native-webview dependency.
  This is an explicitly disclosed hybrid design test, not a completed native port.
- All typography, layouts, avatars, stickers, icons and ad examples work without
  downloading the UI. Postinstall generates the ignored `generated/goldHtml.ts`;
  the workflow regenerates after setting the correct build version.
- The WebView has a fixed HTTPS base origin and allows navigation only to that
  origin's root/about:blank. No local file access, mixed content, third-party
  cookies, popups or automatic media playback. A hashed-script CSP restricts
  network connections to the dedicated lounge endpoint and images to bundled data.
- Private chat composition, profile edits, stickers and calls/VPN remain local or
  visual examples. No private account migration or new Firebase activation.
- **Live Lounge is real and public.** Join with a display name; no friend/invite
  is needed. Website and APK use the same server. Names are unverified guest names,
  and the UI explicitly explains public visibility before joining.
- Lounge messages appear only after server acknowledgement. Retry IDs prevent
  duplicate posts; errors are visible and drafts are retained. Reporting, own
  deletion and session-local hiding are available. See community/README.md.

## Validation and publication

52 mobile suites / 447 tests pass, including preview navigation boundaries.
TypeScript and messenger/naming checks pass. Community tests pass 23 checks plus
HTTP preflight, token, two-client delivery, ownership and request/cache controls
against disposable loopback storage. Public join/read and embedded-document
guest joining were verified without posting test messages to the production room.

Native compilation, APK package/version/signature, public download checksum and
homepage preview links must be confirmed before calling the APK downloadable.
Physical phone installation/launch is left for the user's device test; browser
tests do not establish Android WebView compatibility or private calling readiness.
