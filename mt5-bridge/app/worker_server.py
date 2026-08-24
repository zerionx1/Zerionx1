from __future__ import annotations

import json
import os
import selectors
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.getenv("MT5_BRIDGE_TOKEN", "").strip()
PORT = int(os.getenv("PORT", "10000"))
WINDOWS_PYTHON = os.getenv(
    "MT5_WINDOWS_PYTHON",
    "/home/mt5/runtime/python311/python.exe",
).strip()
EXEC_SCRIPT = os.getenv(
    "MT5_WORKER_EXEC_SCRIPT",
    r"Z:\app\mt5-bridge\app\worker_exec.py",
).strip()
EXEC_TIMEOUT = float(os.getenv("MT5_EXEC_TIMEOUT_SECONDS", "55"))
STARTUP_GRACE = float(os.getenv("MT5_EXEC_STARTUP_GRACE_SECONDS", "0.8"))


class PersistentExecutor:
    def __init__(self):
        self.lock = threading.Lock()
        self.proc: subprocess.Popen[str] | None = None
        self.restarts = 0

    def stop(self):
        proc = self.proc
        self.proc = None
        if not proc or proc.poll() is not None:
            return
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
                proc.wait(timeout=2)
            except Exception:
                pass

    def start(self):
        if self.proc and self.proc.poll() is None:
            return
        self.stop()
        env = os.environ.copy()
        env.setdefault("WINEDEBUG", "-all")
        self.proc = subprocess.Popen(
            ["wine", WINDOWS_PYTHON, EXEC_SCRIPT, "--daemon"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
        )
        self.restarts += 1
        time.sleep(STARTUP_GRACE)
        if self.proc.poll() is not None:
            tail = ""
            try:
                if self.proc.stdout:
                    tail = self.proc.stdout.read()[-800:]
            except Exception:
                pass
            code = self.proc.returncode
            self.proc = None
            raise RuntimeError(
                f"MT5 executor exited during startup (code={code}): {tail or 'no output'}"
            )

    def call(self, payload: dict, timeout: float | None = None) -> dict:
        timeout = timeout or EXEC_TIMEOUT
        with self.lock:
            last_error: Exception | None = None
            for attempt in range(2):
                try:
                    self.start()
                    proc = self.proc
                    if not proc or not proc.stdin or not proc.stdout:
                        raise RuntimeError("MT5 persistent executor failed to start")

                    proc.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n")
                    proc.stdin.flush()

                    selector = selectors.DefaultSelector()
                    selector.register(proc.stdout, selectors.EVENT_READ)
                    deadline = time.monotonic() + timeout
                    try:
                        while time.monotonic() < deadline:
                            remaining = max(0.0, deadline - time.monotonic())
                            events = selector.select(remaining)
                            if not events:
                                break
                            line = proc.stdout.readline()
                            if line == "":
                                raise RuntimeError("MT5 executor exited unexpectedly")
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                data = json.loads(line)
                            except json.JSONDecodeError:
                                print(
                                    f"MT5 executor diagnostic: {line[-500:]}",
                                    flush=True,
                                )
                                continue
                            if isinstance(data, dict):
                                return data
                        raise TimeoutError("MT5 worker timeout")
                    finally:
                        selector.close()
                except (BrokenPipeError, RuntimeError, TimeoutError) as exc:
                    last_error = exc
                    self.stop()
                    if attempt == 0:
                        time.sleep(1.0)
                        continue
                    raise

            raise RuntimeError(
                f"MT5 executor unavailable: {last_error or 'unknown failure'}"
            )


executor = PersistentExecutor()


class Handler(BaseHTTPRequestHandler):
    server_version = "ZerionMT5Worker/2.1"

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)

    def send_json(self, status: int, data: dict):
        body = json.dumps(data, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.send_header("connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        return bool(
            TOKEN
            and self.headers.get("authorization") == f"Bearer {TOKEN}"
        )

    def do_HEAD(self):
        if self.path == "/healthz":
            self.send_response(200)
            self.send_header("content-length", "0")
            self.end_headers()
            return
        self.send_response(404)
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/healthz":
            alive = bool(executor.proc and executor.proc.poll() is None)
            self.send_json(
                200,
                {
                    "ok": True,
                    "service": "zerion-mt5-worker",
                    "executor": "warm" if alive else "lazy",
                    "restarts": executor.restarts,
                },
            )
            return
        self.send_json(404, {"detail": "Not found"})

    def do_POST(self):
        if self.path != "/execute":
            self.send_json(404, {"detail": "Not found"})
            return
        if not self.authorized():
            self.send_json(401, {"detail": "Unauthorized"})
            return

        try:
            length = int(self.headers.get("content-length", "0"))
            if length <= 0 or length > 1048576:
                raise ValueError("Invalid request size")
            payload = json.loads(self.rfile.read(length))
        except Exception as exc:
            self.send_json(400, {"detail": str(exc)})
            return

        try:
            data = executor.call(payload)
            status = int(data.pop("_status", 200))
            self.send_json(status, data)
        except TimeoutError:
            executor.stop()
            self.send_json(
                504,
                {"detail": "MT5 worker timeout after automatic executor restart"},
            )
        except Exception as exc:
            executor.stop()
            self.send_json(
                502,
                {
                    "detail": (
                        "MT5 executor failure after automatic restart: "
                        f"{type(exc).__name__}: {exc}"
                    )
                },
            )


if not TOKEN:
    raise RuntimeError("MT5_BRIDGE_TOKEN is not configured")

server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
print(
    f"Zerion MT5 worker listening on 0.0.0.0:{PORT} "
    f"(persistent executor, script={EXEC_SCRIPT})",
    flush=True,
)
try:
    server.serve_forever()
finally:
    executor.stop()
