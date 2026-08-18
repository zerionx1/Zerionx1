#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="${1:-$HOME/Projects/zerion-x1}"
cd "$ROOT"

echo "== Zerion X1 Phase 12: Multi-market data, brokers, paper trading =="
test -f src/config/brokers.ts || { echo "ERROR: Patch files not unzipped into repo"; exit 1; }

rm -f tsconfig.tsbuildinfo
rm -rf .next

echo "Typecheck..."
npm run typecheck
echo "Tests..."
npm test
echo "Production build..."
npm run build

echo
echo "Phase 12 code is installed."
echo "Public/no-secret path: Binance public crypto REST/WebSocket + TradingView chart widget."
echo "Indian/FX execution/data requires the corresponding authorized provider credentials."
