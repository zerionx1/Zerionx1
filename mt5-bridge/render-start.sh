#!/usr/bin/env bash
set -euo pipefail

export WINEPREFIX="${WINEPREFIX:-/home/mt5/.wine}"
export WINEARCH="${WINEARCH:-win64}"
export DISPLAY="${DISPLAY:-:99}"
export PORT="${PORT:-10000}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/home/mt5/.xdg-runtime}"
export WINEDLLOVERRIDES="${WINEDLLOVERRIDES:-mscoree,mshtml=}"
export WINE_SKIP_MONO_INSTALLATION=1
export WINE_SKIP_GECKO_INSTALLATION=1

PYTHON_EXE="/home/mt5/runtime/python311/python.exe"

mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

echo "===== START X DISPLAY ====="

Xvfb "$DISPLAY" -screen 0 1280x720x24 \
  >/tmp/xvfb.log 2>&1 &

sleep 2

echo "===== CHECK WINE PREFIX ====="

if [ ! -f "$WINEPREFIX/drive_c/windows/system32/kernel32.dll" ]; then
  echo "Wine prefix is incomplete: kernel32.dll missing"
  exit 1
fi

echo "Wine prefix OK"

echo "===== TEST WINDOWS PYTHON ====="

wine "$PYTHON_EXE" --version

echo "===== PYTHON PACKAGE CHECK ====="

wine "$PYTHON_EXE" -c \
  "import MetaTrader5, fastapi, uvicorn, numpy; print('MT5 Python packages OK')"

MT5_EXE="$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe"

if [ ! -f "$MT5_EXE" ]; then
  echo "===== INSTALL METATRADER 5 ====="

  timeout 120s \
    wine /home/mt5/downloads/mt5setup.exe /auto \
    >/tmp/mt5-installer.log 2>&1 || true

  sleep 10
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
    -maxdepth 7 \
    -type f \
    -iname '*.exe' \
    | tail -80 || true

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
