#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="${1:-$HOME/Projects/zerion-x1}"
cd "$ROOT"

echo "== Zerion X1 Phase 11: Premium UI/UX + Account =="
test -f src/app/globals.css || { echo "ERROR: Run inside Zerion X1 repo"; exit 1; }
test -f src/app/zerion-premium.css || { echo "ERROR: Patch files not unzipped into repo"; exit 1; }

python - <<'PY'
from pathlib import Path

p = Path("src/app/globals.css")
text = p.read_text()
line = '@import "./zerion-premium.css";'

if line not in text:
    lines = text.splitlines()
    insert_at = 0
    for i, value in enumerate(lines):
        if value.lstrip().startswith("@import"):
            insert_at = i + 1
    lines.insert(insert_at, line)
    p.write_text("\n".join(lines) + "\n")
    print("Added zerion-premium.css import")
else:
    print("Premium CSS import already present")

ignore = Path(".gitignore")
current = ignore.read_text() if ignore.exists() else ""
for entry in ["tsconfig.tsbuildinfo", ".runtime/"]:
    if entry not in current:
        current += ("\n" if current and not current.endswith("\n") else "") + entry + "\n"
ignore.write_text(current)
PY

rm -f tsconfig.tsbuildinfo
rm -rf .next

echo "Running typecheck..."
npm run typecheck
echo "Running tests..."
npm test
echo "Running production build..."
npm run build

echo "Phase 11 applied successfully."
