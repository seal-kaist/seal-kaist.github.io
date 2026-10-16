"""Verify all committed video inputs, scripts, fonts and calibration files."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / 'data/residualquant-terminal/manifest.json').read_text())
for relative, expected in manifest['sha256'].items():
    actual = hashlib.sha256((root / relative).read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f'Checksum mismatch: {relative}')
print(f"Verified {len(manifest['sha256'])} source/data/font/calibration files.")
