#!/usr/bin/env python3
"""Atomically install a verified Android release into the existing Realgram site.

Only updates the Android download URL/version and metadata; it preserves other
homepage changes, including Windows, SEO and localized content.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import zipfile


def atomic_bytes(path: Path, data: bytes):
    fd, tmp = tempfile.mkstemp(prefix=".realgram-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as file:
            file.write(data)
            file.flush()
            os.fsync(file.fileno())
        if path.exists():
            os.chmod(tmp, path.stat().st_mode & 0o777)
        else:
            os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def edit_page(raw: str, version: str, persian: bool):
    # Restrict replacement to the Android button, not rollback or Windows links.
    button_pattern = re.compile(
        r'(<a\s+href=")(?:https://realgram\.no)?/download/'
        r'RealGram-(?:latest|\d+\.\d+\.\d+)\.apk(" class="platform-dl-btn")'
    )
    raw, buttons = button_pattern.subn(
        r'\g<1>/download/RealGram-latest.apk\2', raw
    )
    if buttons != 1:
        raise RuntimeError(f"Unexpected Android download button count: {buttons}")
    raw = re.sub(
        r'("downloadUrl"\s*:\s*")https://realgram\.no/download/'
        r'RealGram-(?:latest|\d+\.\d+\.\d+)\.apk(")',
        r'\g<1>https://realgram.no/download/RealGram-latest.apk\2',
        raw,
    )
    start, end = (
        ("<!-- VERSION_START_FA -->", "<!-- VERSION_END_FA -->")
        if persian else ("<!-- VERSION_START -->", "<!-- VERSION_END -->")
    )
    if raw.count(start) != 1 or raw.count(end) != 1:
        raise RuntimeError("Download version markers missing or ambiguous")
    shown = version.translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")) if persian else version
    label = (
        f"نسخه‌ی {shown} · APK مستقیم" if persian
        else f"v{shown} · direct APK"
    )
    replacement = f'{start}<span class="platform-dl-version" data-realgram-download-version>{label}</span>{end}'
    raw = re.sub(re.escape(start) + r".*?" + re.escape(end),
                 lambda _: replacement, raw, flags=re.DOTALL)
    return raw


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--web-root", required=True, type=Path)
    parser.add_argument("--apk", required=True, type=Path)
    parser.add_argument("--version", required=True)
    parser.add_argument("--version-code", required=True, type=int)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--expected-sha", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"\d+\.\d+\.\d+", args.version):
        parser.error("Invalid version")
    if not re.fullmatch(r"[a-f0-9]{40}", args.source_sha):
        parser.error("Invalid source commit")
    if not re.fullmatch(r"[a-f0-9]{64}", args.expected_sha):
        parser.error("Invalid APK checksum")
    root = args.web_root.resolve(strict=True)
    apk = args.apk.resolve(strict=True)
    pages = [(root / "index.html", False), (root / "fa/index.html", True)]
    for page, _ in pages:
        if not page.is_file():
            raise RuntimeError(f"Missing page: {page}")
    if not zipfile.is_zipfile(apk):
        raise RuntimeError("APK is not a valid ZIP container")
    sha = hashlib.file_digest(apk.open("rb"), "sha256").hexdigest()
    if sha != args.expected_sha:
        raise RuntimeError("Uploaded APK checksum mismatch")
    target_dir = root / "download"
    if not target_dir.is_dir():
        raise RuntimeError(f"Download directory missing: {target_dir}")
    dest = target_dir / "RealGram-latest.apk"
    manifest = target_dir / "release.json"
    mobile_manifest = target_dir / "version.json"
    current_file = mobile_manifest if mobile_manifest.is_file() else manifest
    if current_file.is_file():
        current = json.loads(current_file.read_text())
        if int(current.get("versionCode", 0)) > args.version_code:
            raise RuntimeError("Refusing to downgrade installed release")
        if (int(current.get("versionCode", 0)) == args.version_code and
                current.get("sha256") not in (None, sha)):
            raise RuntimeError("Different binary with existing versionCode")
    versioned_apk = target_dir / f"RealGram-{args.version}.apk"
    if versioned_apk.exists():
        with versioned_apk.open("rb") as existing:
            if hashlib.file_digest(existing, "sha256").hexdigest() != sha:
                raise RuntimeError("Existing versioned APK differs from verified build")
    modified = [(page, edit_page(page.read_text(), args.version, fa))
                for page, fa in pages]
    metadata = {
        "version": args.version,
        "versionCode": args.version_code,
        "sourceCommit": args.source_sha,
        "sha256": sha,
        "apkUrl": "https://realgram.no/download/RealGram-latest.apk",
    }
    # Preserve versioned APKs, and atomically repoint the stable URL.
    if not versioned_apk.exists():
        fd, staged = tempfile.mkstemp(prefix=".realgram-apk-", dir=target_dir)
        try:
            with os.fdopen(fd, "wb") as dst, apk.open("rb") as src:
                shutil.copyfileobj(src, dst)
                dst.flush()
                os.fsync(dst.fileno())
            os.chmod(staged, 0o644)
            os.replace(staged, versioned_apk)
        finally:
            if os.path.exists(staged):
                os.unlink(staged)
    staged_link = target_dir / ".RealGram-latest-next.apk"
    if staged_link.exists() or staged_link.is_symlink():
        staged_link.unlink()
    staged_link.symlink_to(versioned_apk.name)
    staged_link.replace(dest)
    for page, new in modified:
        atomic_bytes(page, new.encode("utf-8"))
    payload = (json.dumps(metadata, indent=2) + "\n").encode()
    atomic_bytes(manifest, payload)
    mobile_metadata = dict(metadata, apkUrlFallback="https://realgram.no/download/" + versioned_apk.name)
    atomic_bytes(mobile_manifest, (json.dumps(mobile_metadata, indent=2) + "\n").encode())
    print(f"Published Realgram v{args.version}; sha256={sha}")


if __name__ == "__main__":
    main()
