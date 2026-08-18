#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"
echo "===== APPLYING PHASE 17 VISUAL CMS ====="
cp -R phase17_payload/src/* src/
mkdir -p supabase/migrations
cp phase17_payload/supabase/migrations/20260818_phase17_visual_cms.sql supabase/migrations/
cp phase17_payload/PHASE_17_README.md .
python - <<'P'
from pathlib import Path
p=Path('src/app/globals.css');t=p.read_text();line='@import "./phase-17-cms.css";'
if line not in t:
 L=t.splitlines();i=0
 while i<len(L) and L[i].lstrip().startswith('@import'):i+=1
 L.insert(i,line);p.write_text('\n'.join(L)+'\n')
print('Phase 17 CSS import ready')
P
rm -f tsconfig.tsbuildinfo; rm -rf .next
npm run typecheck
npm test
npm run build
echo "===== PHASE 17 INSTALLED ====="
