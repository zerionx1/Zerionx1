#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

cd "${HOME}/Projects/zerion-x1"

ENV_FILE=".env.local"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "===== ZERION X1 PROVIDER CREDENTIALS ====="
echo "Values stay on this device. Nothing is printed back."
echo

read -r -p "Upstox Client ID / API Key: " UPSTOX_CLIENT_ID
read -r -s -p "Upstox Client Secret: " UPSTOX_CLIENT_SECRET
echo
read -r -p "cTrader Client ID: " CTRADER_CLIENT_ID
read -r -s -p "cTrader Client Secret: " CTRADER_CLIENT_SECRET
echo

if command -v openssl >/dev/null 2>&1; then
  BROKER_TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32 | tr -d '\n')"
else
  BROKER_TOKEN_ENCRYPTION_KEY="$(python - <<'PY'
import base64, os
print(base64.b64encode(os.urandom(32)).decode())
PY
)"
fi

export UPSTOX_CLIENT_ID UPSTOX_CLIENT_SECRET CTRADER_CLIENT_ID CTRADER_CLIENT_SECRET BROKER_TOKEN_ENCRYPTION_KEY

python - <<'PY'
from pathlib import Path
import os

path = Path(".env.local")
existing = path.read_text().splitlines()

values = {
    "NEXT_PUBLIC_APP_URL": "https://zerionx1.vercel.app",
    "UPSTOX_CLIENT_ID": os.environ["UPSTOX_CLIENT_ID"],
    "UPSTOX_CLIENT_SECRET": os.environ["UPSTOX_CLIENT_SECRET"],
    "UPSTOX_REDIRECT_URI": "https://zerionx1.vercel.app/api/brokers/upstox/callback",
    "CTRADER_CLIENT_ID": os.environ["CTRADER_CLIENT_ID"],
    "CTRADER_CLIENT_SECRET": os.environ["CTRADER_CLIENT_SECRET"],
    "CTRADER_REDIRECT_URI": "https://zerionx1.vercel.app/api/brokers/ctrader/callback",
    "BROKER_TOKEN_ENCRYPTION_KEY": os.environ["BROKER_TOKEN_ENCRYPTION_KEY"],
}

out = []
seen = set()

for line in existing:
    if "=" in line and not line.lstrip().startswith("#"):
        key = line.split("=", 1)[0].strip()
        if key in values:
            out.append(f"{key}={values[key]}")
            seen.add(key)
            continue
    out.append(line)

for key, value in values.items():
    if key not in seen:
        out.append(f"{key}={value}")

path.write_text("\n".join(out).rstrip() + "\n")
print("Credentials written to .env.local")
print("Redirect URIs configured for Upstox and cTrader")
print("Broker token encryption key generated")
PY

chmod 600 "$ENV_FILE"

echo
echo "===== SAFE CONFIG CHECK ====="
python - <<'PY'
from pathlib import Path

wanted = [
    "NEXT_PUBLIC_APP_URL",
    "UPSTOX_CLIENT_ID",
    "UPSTOX_CLIENT_SECRET",
    "UPSTOX_REDIRECT_URI",
    "CTRADER_CLIENT_ID",
    "CTRADER_CLIENT_SECRET",
    "CTRADER_REDIRECT_URI",
    "BROKER_TOKEN_ENCRYPTION_KEY",
]

values = {}
for line in Path(".env.local").read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        values[k] = v

for key in wanted:
    value = values.get(key, "")
    print(f"{key}: {'PRESENT' if value else 'MISSING'}")
PY

echo
echo "Do NOT git add .env.local."
