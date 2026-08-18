#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

cd "${HOME}/Projects/zerion-x1"

echo "===== ZERION X1 PHASE 13 ====="
echo "Production trading + premium UX foundation"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".phase-backups/phase13-${STAMP}"
mkdir -p "$BACKUP"

FILES=(
  "src/types/broker.ts"
  "src/config/brokers.ts"
  "src/app/api/brokers/route.ts"
  "src/components/brokers/broker-connection-center.tsx"
  "src/app/dashboard/brokers/page.tsx"
  "src/config/strategy-templates.ts"
  "src/components/strategies/strategy-template-gallery.tsx"
)

echo "===== BACKUP ====="
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp "$f" "$BACKUP/$f"
  fi
done

echo "===== INSTALLING FILES ====="
cp -R phase13_payload/src/* src/
cp phase13_payload/PHASE_13_README.md ./PHASE_13_README.md

# Ensure the Phase 13 CSS override is imported once, after the existing premium layer.
python - <<'PY'
from pathlib import Path

path = Path("src/app/globals.css")
text = path.read_text()
line = '@import "./phase-13-premium.css";'

if line not in text:
    # imports must stay at the top for CSS parsers
    lines = text.splitlines()
    insert_at = 0
    while insert_at < len(lines) and lines[insert_at].lstrip().startswith("@import"):
        insert_at += 1
    lines.insert(insert_at, line)
    path.write_text("\n".join(lines) + "\n")
    print("Phase 13 premium CSS import added")
else:
    print("Phase 13 premium CSS import already present")
PY

# Ensure generated TS build state is never treated as source.
rm -f tsconfig.tsbuildinfo
rm -rf .next coverage

echo "===== TYPECHECK ====="
npm run typecheck

echo "===== TESTS ====="
npm test

echo "===== BUILD ====="
npm run build

echo
echo "===== PHASE 13 INSTALLED ====="
echo "Next: add Upstox + cTrader credentials through the secure Termux prompt."
echo "Backup: $BACKUP"
