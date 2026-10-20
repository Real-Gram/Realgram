#!/usr/bin/env python3
"""Stage native executables from a hash-pinned, previously verified RealGram archive."""
import argparse, hashlib, pathlib, tempfile, urllib.request, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
URL = 'https://github.com/Real-Gram/Realgram/releases/download/android-native-v1/RealGram-Android-Native-v1.zip'
SHA256 = '10a4e49f874a4b83fab7501dfddc1387c47d28192b52a5a8bd8304ba50ea7b14'
parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=pathlib.Path)
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix='realgram-native-') as temporary:
    archive_path = args.archive or pathlib.Path(temporary) / 'RealGram-native.zip'
    if not args.archive:
        with urllib.request.urlopen(URL, timeout=120) as response, archive_path.open('wb') as target:
            while chunk := response.read(1024 * 1024): target.write(chunk)
    if hashlib.file_digest(archive_path.open('rb'), 'sha256').hexdigest() != SHA256:
        raise SystemExit('Native source archive hash does not match the verified release')
    with zipfile.ZipFile(archive_path) as archive:
        for abi in ('arm64-v8a', 'armeabi-v7a'):
            for library in ('libxray.so', 'libtun2socks.so'):
                entry = abi + '/' + library
                output = ROOT / 'mobile-app/android/app/src/main/jniLibs' / abi / library
                output.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(entry) as source, output.open('wb') as target:
                    while chunk := source.read(1024 * 1024): target.write(chunk)
                output.chmod(0o755)
                print('Staged', abi, library)
