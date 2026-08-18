#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"

echo "===== UI/UX PRO MAX DESIGN TOOL ====="
npm install -g ui-ux-pro-max-cli
uipro init --ai universal

mkdir -p design-system
if [ -f ".agents/skills/ui-ux-pro-max/scripts/search.py" ]; then
  python3 .agents/skills/ui-ux-pro-max/scripts/search.py \
    "fintech trading AI-native financial dashboard luxury dark bento glassmorphism responsive" \
    --design-system -f markdown > design-system/UI_UX_PRO_MAX_GENERATED.md || true
fi

echo "UI/UX Pro Max installed as a DESIGN-TIME tool."
echo "It is not a browser runtime CSS dependency."
