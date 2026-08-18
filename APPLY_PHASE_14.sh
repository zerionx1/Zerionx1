#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"

echo "===== APPLYING PHASE 14 ====="
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".phase-backups/phase14-${STAMP}"
mkdir -p "$BACKUP"

for f in src/app/globals.css; do
  [ -f "$f" ] && cp "$f" "$BACKUP/$(basename "$f")"
done

cp -R phase14_payload/src/* src/
mkdir -p supabase/migrations
cp phase14_payload/supabase/migrations/20260818_phase14_live_trading.sql supabase/migrations/
cp phase14_payload/PHASE_14_README.md ./PHASE_14_README.md

python - <<'PY'
from pathlib import Path
path=Path("src/app/globals.css")
text=path.read_text()
line='@import "./phase-14-live.css";'
if line not in text:
    lines=text.splitlines()
    i=0
    while i < len(lines) and lines[i].lstrip().startswith("@import"):
        i+=1
    lines.insert(i,line)
    path.write_text("\n".join(lines)+"\n")
print("Phase 14 CSS import ready")
PY

rm -f tsconfig.tsbuildinfo
rm -rf .next

echo "===== PHASE 14 TYPECHECK ====="
npm run typecheck
echo "===== PHASE 14 TESTS ====="
npm test
echo "===== PHASE 14 BUILD ====="
npm run build

echo "===== PHASE 14 INSTALLED ====="
echo "Run the Phase 14 Supabase migration before persisted live trade proposals are used."
