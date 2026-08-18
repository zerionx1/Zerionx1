#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"

echo "===== APPLYING PHASE 15 ====="
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".phase-backups/phase15-${STAMP}"
mkdir -p "$BACKUP"

for f in src/app/globals.css; do
  [ -f "$f" ] && cp "$f" "$BACKUP/$(basename "$f")"
done

cp -R phase15_payload/src/* src/
mkdir -p supabase/migrations
cp phase15_payload/supabase/migrations/20260818_phase15_ai_orchestration.sql supabase/migrations/
cp phase15_payload/PHASE_15_README.md ./PHASE_15_README.md
cp phase15_payload/UI_UX_PRO_MAX_REFERENCE.md ./UI_UX_PRO_MAX_REFERENCE.md

python - <<'PY'
from pathlib import Path
path=Path("src/app/globals.css")
text=path.read_text()
line='@import "./phase-15-ai.css";'
if line not in text:
    lines=text.splitlines()
    i=0
    while i < len(lines) and lines[i].lstrip().startswith("@import"):
        i+=1
    lines.insert(i,line)
    path.write_text("\n".join(lines)+"\n")
print("Phase 15 CSS import ready")
PY

rm -f tsconfig.tsbuildinfo
rm -rf .next

echo "===== PHASE 15 TYPECHECK ====="
npm run typecheck
echo "===== PHASE 15 TESTS ====="
npm test
echo "===== PHASE 15 BUILD ====="
npm run build

echo "===== PHASE 15 INSTALLED ====="
echo "Run the Phase 15 Supabase migration before AI chat persistence is used."
echo "PowerX can be attached later with POWERX_BASE_URL + POWERX_API_KEY."
