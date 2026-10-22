# IMO connectivity investigation — 22 October 2026

## What was actually inspected

Downloaded the stable Android APK directly from https://imo.im/download:
https://static-web.imoim.net/as/indigo-static/imo-apks-for-all-channels/imo-stable-build428-2026.09.1051-imo_official_pc.apk

- Package: `com.imo.android.imoim`
- Version: `2026.09.1051`, code `26091051`
- File SHA-256: `9f9691516b59c84816338fcdae4b6928ff15f55cd889fb50c5eb4190d33d9a2c`
- Parsed signing-certificate SHA-256: `44483f98c17bf49fbde08d3376af09c6fc1f9370c7a046c35a3dca45f5785150`
- Method: Androguard APK/manifest/DEX metadata and native ELF symbol inspection.
  The certificate is recorded from the package, not independently compared to a
  Play-installed copy. No third-party code/binaries are incorporated into Realgram.

This is static reverse engineering of the distributed client. No IMO account was
signed in, no live call was captured, and no private backend was recovered.

## Observed mechanisms and limits

| Evidence in this APK | What it supports | What remains unproven |
| --- | --- | --- |
| `sg.bigo.overwall.config.INervLbs`: `getBackupDomain`, `getBackupIp`, `getHardcodeIP`, `getPorts`, `getProxyDomain`, `getMobileDomains` | Client configuration supports alternate discovery/address/port sources and network-specific domains. | Which sources are selected on any particular Iranian operator. |
| `ISock5Config`: `getSwitch`, `getTags`, `getUrls` | Configurable SOCKS5 support exists. | Whether it is enabled in the observed no-VPN session. |
| `INervChannelConfig`: `getDomain`, `getHost`, `getMode`, `getTlsSpec` | Multiple channel/configuration and TLS options exist. | Exact deployed transport selection, fingerprints and fallback ordering. |
| `libimonetwork.so`: `IMOClientTCPSocketManager`, TLS state/resumption and connection/error handlers | Native persistent TCP/TLS networking and reconnect-related handling exist. | Performance gains, actual timers, and censorship resistance. |
| `libdnsx.so`, `libipv6kit_android.so`, `libcronet.so`, `libbigoopus.so`, `liboverwallsdk.so` | Several DNS/IP/network/media components are bundled. | A bundled library alone does not prove its use in calls, QUIC use, or a particular bitrate algorithm. |

Inference: resilient *in-app* routing is a reasonable architecture to investigate;
it does not require a user-enabled full-device VPN. Static symbols do not establish
why IMO worked on the user's network. Reachability of IMO infrastructure and local
blocking policy can also differ from Realgram's.

IMO's own help acknowledges that some networks block calls, including Iran in its
older help article. It does not promise universal connectivity without VPN:
https://imo.im/en/faq/Unable-to-Call
https://imo.im/en/faq/Why-am-I-having-trouble-with-imo-calls?lang=en

## Realgram changes and next experiments

1. Messaging/API and WSS remain independent of the device VPN toggle. Do not make
   opening Chats, receiving a push or answering an audio call depend on a paid plan.
2. Backend now supports an **optional** `calling_turn_tls_url` such as
   `turns:turn.realgram.no:443?transport=tcp`, alongside existing UDP/TCP TURN.
   This is a configuration example, **not a deployed/verified endpoint**. It is
   advertised only with a configured TURN secret. Configure a separate working
   listener and certificate first; keep HMAC credentials short-lived.
3. Run `python3 scripts/probe-messenger-network.py --label <network-vpn-off>` on
   each test network. It checks DNS, IPv4/IPv6 TCP, verified TLS, HTTPS and a valid
   WSS upgrade. A successful probe is not proof of message delivery or media.
4. Next native experiment: explicit network-change callbacks, reconnect/rejoin of
   authenticated signaling rooms, and ICE restart after Wi-Fi/mobile handover.
   Current socket reconnect alone does not prove an active call survives handover.
5. Then test authenticated endpoint discovery/fallback inside the app. Keep TLS
   verification, E2E message keys and existing delivery deduplication intact.
   Do not hardcode IMO endpoints or use its infrastructure.

TURN references:
https://www.rfc-editor.org/rfc/rfc8835.html
https://webrtc.org/getting-started/turn-server
https://github.com/coturn/coturn/wiki/turnserver

## Required same-network comparison before making no-VPN claims

Use two consenting test accounts and two real Android phones. For both IMO and
Realgram, record app versions, operator, Wi-Fi/mobile, VPN disabled, and timestamps.
Do not capture message bodies, contacts, audio or credentials in shared reports.

| Scenario | Measurements |
| --- | --- |
| Direct Wi-Fi and mobile, separate operators | Message delivery success/latency, call setup time, selected Realgram ICE candidate/transport, bytes/minute. |
| UDP blocked, TCP 443 available in an isolated test network | Verify media actually uses TURN/TLS, not just that WSS connects. |
| Loss/latency/bandwidth limits in an isolated test network | 1/3/5% loss, 100/300/600 ms RTT, audio continuity and reconnect time. |
| Wi-Fi to mobile and back | Audio interruption, room rejoin, ICE restart and duplicate-message behavior. |
| Screen locked/app backgrounded after 30 minutes | FCM delivery, native ringing, answer/decline, cancellation and stale invite rejection. |
| App force-stopped / device offline | Record OS limitations; do not promise ringing without internet or after a force-stop. |

Results for user-network comparisons and physical background-call tests: **pending**.

## Measured public transport checks

On the existing VPS network at 18:48 UTC on 22 October, the probe established
TLS 1.3 to both Realgram hosts. `api.realgram.no/ws/call` returned a valid HTTP
101 WebSocket handshake (50 ms). `realgram.no` returned HTTP 200 over IPv4 and
IPv6 (39/36 ms); the unauthenticated API URL returned HTTP 404 over IPv4 (50 ms),
which proves TLS/HTTP reachability only. No API IPv6 address was returned.

This was server-network egress, not an Iranian mobile-network or phone test.
The WSS route is publicly reachable; authenticated room joins, real call audio,
Firebase/background delivery and TURN/TLS configuration are still unverified.
