#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"
echo "===== APPLYING PHASE 19 — BROKER + F&O CORRECTIONS ====="

STAMP="$(date +%Y%m%d-%H%M%S)"
BACK=".phase-backups/phase19-${STAMP}"
mkdir -p "$BACK"
for f in src/components/brokers/broker-connection-center.tsx src/components/paper/paper-trading-workspace.tsx src/app/globals.css; do
 if [ -f "$f" ]; then mkdir -p "$BACK/$(dirname "$f")"; cp "$f" "$BACK/$f"; fi
done

cp -R phase19_payload/src/* src/

python3 - <<'PY'
from pathlib import Path
p=Path("src/app/globals.css")
t=p.read_text()
line='@import "./phase-19-fno.css";'
if line not in t:
    lines=t.splitlines()
    i=0
    while i<len(lines) and lines[i].lstrip().startswith("@import"): i+=1
    lines.insert(i,line)
    p.write_text("\n".join(lines)+"\n")
print("Phase 19 F&O CSS imported.")
PY

rm -rf .next
rm -f tsconfig.tsbuildinfo
npm run typecheck
npm test
npm run build
echo "===== PHASE 19 INSTALLED ====="
echo "Check /api/brokers/config-status after deployment to verify Vercel sees credentials."
echo "F&O workspace: /dashboard/markets/fno"
