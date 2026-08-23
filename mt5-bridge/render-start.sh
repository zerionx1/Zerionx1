#!/usr/bin/env bash
set -euo pipefail

export WINEPREFIX="${WINEPREFIX:-/home/mt5/.wine}"
export DISPLAY="${DISPLAY:-:99}"
export PORT="${PORT:-10000}"

echo "===== START X DISPLAY ====="
Xvfb "$DISPLAY" -screen 0 1280x720x24 >/tmp/xvfb.log 2>&1 &
sleep 2

echo "===== INITIALIZE WINE ====="
wineboot --init
sleep 3

PYTHON_EXE="$WINEPREFIX/drive_c/Python311/python.exe"

if [ ! -f "$PYTHON_EXE" ]; then
  echo "===== INSTALL WINDOWS PYTHON ====="
  wine /home/mt5/downloads/python.exe \
    /quiet \
    InstallAllUsers=0 \
    TargetDir=C:\\Python311 \
    PrependPath=1 \
    Include_test=0

  sleep 5
fi

if [ ! -f "$PYTHON_EXE" ]; then
  echo "Windows Python installation failed"
  exit 1
fi

echo "===== INSTALL PYTHON PACKAGES ====="
wine "$PYTHON_EXE" -m pip install --upgrade pip

wine "$PYTHON_EXE" -m pip install \
  fastapi==0.116.1 \
  "uvicorn[standard]==0.35.0" \
  pydantic==2.11.7 \
  MetaTrader5

MT5_EXE="$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe"

if [ ! -f "$MT5_EXE" ]; then
  echo "===== INSTALL METATRADER 5 ====="
  wine /home/mt5/downloads/mt5setup.exe /auto
  sleep 15
fi

echo "===== FIND MT5 TERMINAL ====="

if [ ! -f "$MT5_EXE" ]; then
  MT5_EXE="$(find "$WINEPREFIX/drive_c" -type f -iname 'terminal64.exe' | head -1 || true)"
fi

if [ -z "${MT5_EXE:-}" ] || [ ! -f "$MT5_EXE" ]; then
  echo "MetaTrader 5 terminal64.exe was not found"
  find "$WINEPREFIX/drive_c" -maxdepth 5 -iname '*terminal*.exe' -print || true
  exit 1
fi

export MT5_TERMINAL_PATH="$(winepath -w "$MT5_EXE")"

echo "===== START MT5 ====="
wine "$MT5_EXE" /portable >/tmp/mt5.log 2>&1 &
sleep 10

echo "===== START ZERION MT5 BRIDGE ====="

cd /app/mt5-bridge

exec wine "$PYTHON_EXE" -m uvicorn \
  app.main:app \
  --host 0.0.0.0 \
  --port "$PORT"
