# Claude handoff — Realgram Gold After Dark

The user approved the gold/dark concept and requested an HTML review at
https://setai.no/realgram/ **before another APK**. Continue implementation in the
canonical https://github.com/Real-Gram/Realgram repository only.

## Read first

1. `AGENTS.md` and `docs/realgram/MIGRATION_STATUS.md`.
2. `docs/design/GOLD_AFTER_DARK.md` for design tokens, layouts and acceptance.
3. `docs/design/realgram-gold-after-dark.png` for the approved visual target.
4. `web-preview/realgram/` for the working HTML/CSS/JS and illustration assets.
5. `docs/realgram/DESIGN_PREVIEW.md` for the previous APK's installation boundary.

The source branch is `feat/realgram-gold-ui-20261023`, based on the previous design
preview branch at `55964678bec0be8f0d52b3f3277cae1f00390f7a`. Keep the stacked work.
Do not merge branches, replace the stable APK or change credentials. The user subsequently authorized a new APK with this theme and a real public Live Lounge. See GOLD_APK_0.9.152.md; this overrides the earlier HTML-only/no-APK instruction for this separate design test.

## Completed scope

- Approved original concept image and explicit design specification.
- Original fictional 3D people/sticker/headphones atlas, local icons and wallpaper.
- Buildless responsive prototype with five tabs, chat master/detail, search and
  filters, local messages/stickers/reactions, visual voice/call/connection states,
  editable session-local profile/status and example clan code copying.
- Ad cards above chat and call logs, clearly labeled Demo. No advertising API.
- No live accounts, calling, VPN, recording, file uploads or external GIF service.

## Native port map

| HTML reference | Existing native destination |
| --- | --- |
| `style.css` tokens, navigation | `src/design/tokens.ts`, `components/BottomNav.tsx` |
| Chats + conversation | `screens/InboxScreen.tsx`, existing DM components/stores |
| Calls / profile / clan / connection | `screens/MessengerScreens.tsx` |
| Ad card / placement | `components/AdBanner.tsx`, existing SDK telemetry helpers |
| Separate example-data build | `preview/DesignPreviewApp.tsx`, existing guarded fixtures |

Follow the reference while preserving the existing real data flows, mutations,
errors and accessibility. Reuse the existing feature gates and preview boundary.
No game/payment access. Keep Realgram naming everywhere. The explicit HTML review
host is a user-authorized exception to the normal production-domain rule.

## Do not overstate verification

A browser screenshot is not an APK test. A visual call is not a background call.
The native API previously rejected the client token; Firebase/original signing
and physical-device background ringing were not activated. Do not silently
mark these resolved. Source tests and a mock banner do not establish ad revenue.

Deployment and validation results are recorded in `WEB_PREVIEW_STATUS.md`.
