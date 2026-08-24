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
export WINEDEBUG="${WINEDEBUG:--all}"

mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

cleanup() {
  jobs -pr | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "===== START X DISPLAY ====="
Xvfb "$DISPLAY" -screen 0 800x600x16 >/tmp/xvfb.log 2>&1 &
sleep 2

MT5_EXE="$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe"
if [ ! -f "$MT5_EXE" ]; then
  MT5_EXE="$(find "$WINEPREFIX/drive_c" -type f -iname 'terminal64.exe' | head -1 || true)"
fi
if [ -z "${MT5_EXE:-}" ] || [ ! -f "$MT5_EXE" ]; then
  echo "MT5 terminal not found"
  exit 1
fi

export MT5_TERMINAL_PATH="$(winepath -w "$MT5_EXE")"
export MT5_WORKER_EXEC_SCRIPT="$(winepath -w /app/mt5-bridge/app/worker_exec.py)"
export MT5_WINDOWS_PYTHON="/home/mt5/runtime/python311/python.exe"

echo "===== MT5 RUNTIME ====="
echo "terminal=$MT5_TERMINAL_PATH"
echo "worker_script=$MT5_WORKER_EXEC_SCRIPT"

echo "===== START MT5 TERMINAL ====="
wine "$MT5_EXE" /portable >/tmp/mt5.log 2>&1 &

# Give Wine/terminal IPC a short warm-up window before the first user login.
sleep "${MT5_TERMINAL_WARMUP_SECONDS:-8}"

# Do not fail the service only because the GUI process changes PID under Wine;
# the worker's initialize() retry is the authoritative readiness check.
echo "===== START HARDENED MT5 WORKER ====="
cd /app/mt5-bridge
exec python3 app/worker_server.py
