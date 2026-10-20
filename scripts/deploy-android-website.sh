#!/usr/bin/env bash
# Deploy a verified, production-signed Android update to realgram.no.
set -euo pipefail
apk="$1"
for var in REALGRAM_DEPLOY_HOST REALGRAM_DEPLOY_USER REALGRAM_DEPLOY_WEBROOT REALGRAM_DEPLOY_SSH_PRIVATE_KEY REALGRAM_DEPLOY_KNOWN_HOSTS; do
  if [ -z "$(printenv "$var")" ]; then echo "Required deploy setting missing: $var" >&2; exit 1; fi
done
[[ -f "$apk" ]] || { echo "APK missing" >&2; exit 1; }
[[ "$REALGRAM_DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
[[ "$REALGRAM_DEPLOY_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
[[ "$REALGRAM_DEPLOY_WEBROOT" =~ ^/[a-zA-Z0-9_./-]+$ ]] || exit 1
[[ "$REALGRAM_DEPLOY_WEBROOT" != *..* ]] || exit 1
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$repo_root/mobile-app/package.json').version")"
version_code="$(sed -nE 's/^[[:space:]]*versionCode[[:space:]]+([0-9]+).*$/\1/p' "$repo_root/mobile-app/android/app/build.gradle")"
sha="$(sha256sum "$apk" | cut -d' ' -f1)"
source_sha="$(git -C "$repo_root" rev-parse HEAD)"
tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT
printf '%s\n' "$REALGRAM_DEPLOY_SSH_PRIVATE_KEY" > "$tmp/id_ed25519"
chmod 600 "$tmp/id_ed25519"
printf '%s\n' "$REALGRAM_DEPLOY_KNOWN_HOSTS" > "$tmp/known_hosts"
chmod 600 "$tmp/known_hosts"
target="$REALGRAM_DEPLOY_USER@$REALGRAM_DEPLOY_HOST"
stage="/tmp/realgram-ci-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
ssh -i "$tmp/id_ed25519" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$tmp/known_hosts" "$target" "umask 077; mkdir -p '$stage'"
cleanup_remote() {
  ssh -i "$tmp/id_ed25519" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$tmp/known_hosts" "$target" "rm -rf '$stage'" || true
}
trap 'cleanup_remote; cleanup' EXIT
scp -i "$tmp/id_ed25519" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$tmp/known_hosts" \
  "$apk" "$repo_root/scripts/deploy-android-site.py" "$target:$stage/"
ssh -i "$tmp/id_ed25519" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$tmp/known_hosts" \
  "$target" python3 "$stage/deploy-android-site.py" \
  --web-root "$REALGRAM_DEPLOY_WEBROOT" \
  --apk "$stage/$(basename "$apk")" \
  --download-only --version "$version" --version-code "$version_code" \
  --source-sha "$source_sha" --expected-sha "$sha"
echo "Realgram website APK deployment completed"
