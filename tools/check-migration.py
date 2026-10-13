"""Verify the migration independently of the original checkout."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/migration-manifest.json').read_text())
errors = []
for item in manifest['files']:
    target = root / item['destination']
    if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
        errors.append(item['destination'])
if errors:
    raise SystemExit('Migration mismatch:\n' + '\n'.join(errors))
print(f"Verified {len(manifest['files'])} migrated files (SHA-256).")
