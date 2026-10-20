# Realgram

Realgram brings messaging, communities, calls, resilient connectivity and the
Shahnameh/REAL ecosystem together under REAL-ID.

This is the canonical repository for the website, mobile/desktop clients,
messaging backend and build workflows: https://github.com/Real-Gram/Realgram.

| Path | Purpose |
|---|---|
| Website root and `fa/` | Public site at https://realgram.no |
| `mobile-app/` | Shared React Native app and Android/iOS/Windows projects |
| `backend/public/` | PHP API entry points |
| `backend/lib/` | Messaging, calling, identity and quota logic |
| `services/calling-relay/` | WebSocket signaling and native call push |
| `infra/` | Deployment configuration templates |
| `.github/workflows/` | Build and verification workflows |

Read [AGENTS.md](AGENTS.md) before making changes and
[the migration status](docs/realgram/MIGRATION_STATUS.md) for what is implemented,
what is deployed and what still requires configuration or device testing.

The next app source snapshot is 0.9.150 / build 190. The current website download
remains the verified 0.9.149 APK until a new build is validated and published.

## Development

```sh
python3 scripts/check-realgram-naming.py
cd mobile-app
npm install
npm run type-check
npm test -- --runInBand
```

Before an Android build, stage the hash-verified native dependencies:

```sh
python3 scripts/prepare-android-native.py
```

The default debug app uses the Realgram source namespace. Signed updates retain
the established installation identity and signer through release configuration.
Changing visible branding must not silently create a different installed app or
lose the user's identity.

Credentials, signing keys, private message keys, databases and generated APKs
must stay outside source control. Backend data paths are configurable with
`REALGRAM_DATA_DIR` so a source directory move does not move or recreate data.

Built by [Khabat Setaei](https://www.setai.no) and
[Dr. Nasrin Dadashi](https://www.dadashi.no). See [PEOPLE.md](PEOPLE.md).
