# Realgram working rules

- The canonical repository is https://github.com/Real-Gram/Realgram.
- All app, messaging, backend, website and build changes belong here.
- Use Realgram for project names, source folders and public branding.
- Public URLs must use realgram.no or its configured subdomains. Do not add
  dependencies on another project repository or a retired product domain.
- Preserve the existing Android installation identity and release signer via
  build configuration so updates do not silently create a different account.
- Never commit signing files, service credentials, database files, private
  message keys, runtime configuration or generated APKs.
- Run scripts/check-realgram-naming.py and relevant tests before committing.
- Website root, mobile-app, backend and services are separate deployment
  surfaces. A source commit does not establish that an APK or service is live.
- Read docs/realgram/MIGRATION_STATUS.md for activation blockers and deployment
  state. Update that file when the state changes.
