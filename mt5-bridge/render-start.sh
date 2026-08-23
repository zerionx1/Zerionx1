#!/usr/bin/env bash
set -euo pipefail

export WINEPREFIX="${WINEPREFIX:-/home/mt5/.wine}"
export DISPLAY="${DISPLAY:-:99}"
export PORT="${PORT:-10000}"

PYTHON_EXE="/home/mt5/runtime/python311/python.exe"

echo "===== START X DISPLAY ====="
Xvfb "$DISPLAY" -screen 0 1280x720x24 >/tmp/xvfb.log 2>&1 &
sleep 2

echo "===== INITIALIZE WINE ====="
wineboot --init
sleep 5

echo "===== TEST WINDOWS PYTHON ====="
wine "$PYTHON_EXE" --version

echo "===== BOOTSTRAP PIP ====="

if ! wine "$PYTHON_EXE" -m pip --version >/dev/null 2>&1; then
  wine "$PYTHON_EXE" \
    /home/mt5/downloads/get-pip.py
fi

echo "===== INSTALL WINDOWS PYTHON PACKAGES ====="
wine "$PYTHON_EXE" -m pip install \
  --disable-pip-version-check \
  fastapi==0.116.1 \
  uvicorn==0.35.0 \
  pydantic==2.11.7 \
  MetaTrader5

echo "===== PYTHON PACKAGE CHECK ====="
wine "$PYTHON_EXE" -c \
  "import MetaTrader5, fastapi, uvicorn; print('MT5 Python packages OK')"

MT5_EXE="$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe"

if [ ! -f "$MT5_EXE" ]; then
  echo "===== INSTALL METATRADER 5 ====="

  wine /home/mt5/downloads/mt5setup.exe /auto \
    >/tmp/mt5-installer.log 2>&1 || true

  sleep 20
fi

echo "===== FIND MT5 TERMINAL ====="

if [ ! -f "$MT5_EXE" ]; then
  MT5_EXE="$(
    find "$WINEPREFIX/drive_c" \
      -type f \
      -iname 'terminal64.exe' \
      | head -1 || true
  )"
fi

if [ -z "${MT5_EXE:-}" ] || [ ! -f "$MT5_EXE" ]; then
  echo "MetaTrader 5 terminal64.exe was not found"
  echo "===== MT5 INSTALLER LOG ====="
  cat /tmp/mt5-installer.log 2>/dev/null || true

  echo "===== EXE AUDIT ====="
  find "$WINEPREFIX/drive_c" \
    -maxdepth 6 \
    -type f \
    -iname '*.exe' \
    | tail -50 || true

  exit 1
fi

export MT5_TERMINAL_PATH="$(winepath -w "$MT5_EXE")"

echo "MT5 terminal: $MT5_EXE"

echo "===== START MT5 ====="
wine "$MT5_EXE" /portable \
  >/tmp/mt5.log 2>&1 &

sleep 12

echo "===== START ZERION MT5 BRIDGE ====="

cd /app/mt5-bridge

exec wine "$PYTHON_EXE" -m uvicorn \
  app.main:app \
  --host 0.0.0.0 \
  --port "$PORT"
