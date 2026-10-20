# Realgram — Android calls with the app in background

Status: BLOCKED pending live configuration and two-device proof. No new release
APK is authorized by this checklist until all checks below are true.

## Required user experience

- Realgram is installed on the receiver's Android phone, but need not be open.
- Caller initiates a call from their Realgram account.
- Receiver hears a ringtone and sees an incoming call notification or lock-screen
  call UI even while using a different application or with the display locked.
- Answer opens the app and joins the actual voice call; decline tells the caller.
- Caller ending / 45-second timeout immediately cancels outstanding ringing.
- Duplicate/out-of-order push messages do not trigger duplicate calls.
- A force-stopped app is not guaranteed to receive FCM messages by Android; test
  backgrounded and swiped-away states separately from an explicit Force Stop.

## Existing implementation

- Native Android Firebase Messaging service processes data-only high-priority
  call pushes and shows a high-importance CallStyle notification with ringtone.
- Native answer/decline UI works on the lock screen without React Native startup.
- JavaScript resume validates the pending call with the backend before answering.
- A relay can send FCM invitations and call-cancel events when configured.
- Incoming-call FCM is currently NOT operational in the published test build:
  Firebase Android config is missing, the currently running production relay
  lacks FCM sending support, and the mobile API currently rejects the new client.
  The canonical WebSocket route itself DOES return HTTP 101 and the older
  signaling relay process is live on the Realgram VPS.

## Before the next Android release build

1. Register the exact installed Android package identity in Firebase. Save the
   matching google-services.json content in the canonical repository's secret
   REALGRAM_GOOGLE_SERVICES_JSON, not in Git.
2. Configure a server-side Firebase Messaging service account at a root-readable
   credentials path specified by REALGRAM_FCM_CREDENTIALS in the live relay's
   environment. Never store its JSON private key in Git, issue tracker or chat.
3. Deploy the Realgram backend and Node call relay with preserved account/message
   database and valid distinct voucher/internal-hook signing secrets.
4. Route wss://api.realgram.no/ws/call to the listening relay over WebSocket
   (HTTP/1.1 Upgrade) and check a real 101 response on port 443.
5. Fix the API token compatibility and confirm actual backend registration,
   profile lookup and message delivery on both test phones.
6. Configure Android notification permissions and allow high-priority incoming
   call alerts/full-screen notifications in system settings.
7. Test call receive, ringtone, answer, decline, canceled call, timeout, and
   voice-media delivery with two physical phones: screen locked, app in
   background, and swiped from recents; check Wi-Fi and cellular networks.
   Save test evidence. A successful CI build alone is insufficient.
8. Only after passing tests, set REALGRAM_BACKGROUND_CALL_E2E_VERIFIED=yes in
   canonical repository Actions secrets to unlock the signed release workflow.
9. Confirm release signer matches the currently installed production application
   before an in-place update; do not uninstall or reset existing users.

CI release preflight: scripts/check-realgram-calling-backend.py. It checks the
live client API and HTTP 101 WebSocket upgrade; failures block the release.
Production release builds also require matching Firebase configuration and
explicit two-phone E2E verification.

The published 0.9.150 Preview is a separate debug-signed app and does not yet
satisfy these requirements. Keep the working production APK unchanged.
