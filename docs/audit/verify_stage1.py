"""Read-only documentation and original skill integrity checks for stage 1."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[2]
docs = root / 'docs'
failures = []
baseline = json.loads((docs / 'audit/baseline.json').read_text(encoding='utf-8-sig'))
canonical_lf = 0
for item in baseline:
    path = root / item['Path'].replace('\\', '/')
    if not path.is_file(): failures.append('Original skill/lock missing: ' + item['Path']); continue
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != item['SHA256']:
        # Git stores LF because of .gitattributes. Accept ONLY a pure LF file
        # whose exact CRLF reconstruction reproduces the historical SHA-256.
        if b'\r' not in data and hashlib.sha256(data.replace(b'\n', b'\r\n')).hexdigest() == item['SHA256']:
            canonical_lf += 1
        else: failures.append('Original skill/lock changed: ' + item['Path'])
required = ['PROJECT_VISION', 'TECHNICAL_SPECIFICATION', 'ARCHITECTURE', 'DATABASE_SCHEMA', 'API_CONTRACTS', 'ROADMAP', 'TEST_PLAN', 'ISSUES', 'CHANGELOG', 'DECISIONS', 'STAGE1_PLAN', 'STAGE1_REPORT', 'LOCAL_DEVELOPMENT', 'BACKUP_RESTORE', 'DEPENDENCY_REVIEW']
for name in required:
    if not (docs / (name + '.md')).is_file(): failures.append('Missing document: ' + name)
markdown = [*docs.rglob('*.md'), root / 'AGENTS.md', root / 'README.md']
for path in markdown:
    content = path.read_text(encoding='utf-8-sig')
    if sum(bool(re.match(r'^\s*```', line)) for line in content.splitlines()) % 2:
        failures.append('Unbalanced code fences: ' + str(path.relative_to(root)))
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', content):
        target = target.strip().strip('<>')
        parts = urlsplit(target)
        if parts.scheme or target.startswith('#'): continue
        if parts.path and not (path.parent / unquote(parts.path)).exists():
            failures.append('Broken link: ' + str(path.relative_to(root)) + ' -> ' + target)
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
if not package.get('private'): failures.append('Package must remain private')
if not (root / 'package-lock.json').is_file(): failures.append('Missing dependency lock')
git = ['git', '-c', 'safe.directory=' + root.as_posix()]
remotes = subprocess.run([*git, 'remote'], capture_output=True, text=True)
if remotes.returncode:
    failures.append('Cannot inspect Git remotes')
elif not os.environ.get('CI'):
    # TRAVEL-013 explicitly authorized this origin; other destinations remain closed.
    approved = {'origin': 'https://github.com/normanbrowndp-maker/terreno.git'}
    for name in remotes.stdout.splitlines():
        if name not in approved:
            failures.append('Unapproved Git remote name: ' + name)
            continue
        for arguments in (['get-url', '--all', name], ['get-url', '--push', '--all', name]):
            urls = subprocess.run([*git, 'remote', *arguments], capture_output=True, text=True)
            if urls.returncode or urls.stdout.splitlines() != [approved[name]]:
                failures.append('Unapproved Git remote destination (values redacted): ' + name)
ignored = ['.env.local', '.local/database-state.json', '.local/backups/private.dump', 'node_modules/package.json', 'test-results/result.json']
for path in ignored:
    if subprocess.run([*git, 'check-ignore', '-q', path]).returncode: failures.append('Sensitive/generated path not ignored: ' + path)
print(json.dumps({'status': 'FAIL' if failures else 'PASS', 'original_hashes_checked': len(baseline), 'canonical_LF_verified': canonical_lf, 'markdown_files': len(markdown), 'failures': failures}, indent=2, ensure_ascii=True))
sys.exit(1 if failures else 0)
