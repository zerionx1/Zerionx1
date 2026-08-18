#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"
echo "===== APPLYING PHASE 18 — PRO MAX UI ====="

STAMP="$(date +%Y%m%d-%H%M%S)"
BACK=".phase-backups/phase18-${STAMP}"
mkdir -p "$BACK"
for f in src/app/globals.css src/app/\(marketing\)/page.tsx; do
  if [ -f "$f" ]; then mkdir -p "$BACK/$(dirname "$f")"; cp "$f" "$BACK/$f"; fi
done

cp -R phase18_payload/src/* src/
mkdir -p design-system
cp phase18_payload/DESIGN_SYSTEM_SOURCE.md design-system/ZERION_X1_MASTER.md

python3 - <<'PY'
from pathlib import Path
p=Path("src/app/globals.css")
t=p.read_text()
line='@import "./phase-18-pro-max.css";'
if line not in t:
    lines=t.splitlines()
    i=0
    while i<len(lines) and lines[i].lstrip().startswith("@import"): i+=1
    lines.insert(i,line)
    p.write_text("\n".join(lines)+"\n")
print("Phase 18 global design system imported.")
PY

rm -rf .next
rm -f tsconfig.tsbuildinfo
npm run typecheck
npm test
npm run build
echo "===== PHASE 18 INSTALLED ====="
