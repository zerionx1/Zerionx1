#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"
echo "===== APPLYING PHASE 16 PRICING + BILLING ====="
cp -R phase16_payload/src/* src/
mkdir -p supabase/migrations
cp phase16_payload/supabase/migrations/20260818_phase16_pricing_billing.sql supabase/migrations/
cp phase16_payload/PHASE_16_README.md .
python - <<'P'
from pathlib import Path
p=Path('src/app/globals.css');t=p.read_text();line='@import "./phase-16-billing.css";'
if line not in t:
 L=t.splitlines();i=0
 while i<len(L) and L[i].lstrip().startswith('@import'):i+=1
 L.insert(i,line);p.write_text('\n'.join(L)+'\n')
print('Phase 16 CSS import ready')
P
rm -f tsconfig.tsbuildinfo; rm -rf .next
npm run typecheck
npm test
npm run build
echo "===== PHASE 16 INSTALLED ====="
