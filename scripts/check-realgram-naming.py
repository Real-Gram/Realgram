#!/usr/bin/env python3
"""Prevent retired product names from returning to source paths or content."""
from pathlib import Path
import re, subprocess
root = Path(__file__).resolve().parents[1]
retired = re.compile('seta' + 'link', re.I)
files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
errors = []
for name in sorted(set(filter(None, files))):
    path = root / name
    if not path.is_file():
        continue
    if retired.search(name):
        errors.append(name + ': retired source path')
    try:
        text = path.read_text()
    except (UnicodeError, OSError):
        continue
    for line, content in enumerate(text.splitlines(), 1):
        if retired.search(content):
            errors.append(f'{name}:{line}: retired product reference')
if errors:
    raise SystemExit('\n'.join(errors))
print('Realgram naming check passed')
