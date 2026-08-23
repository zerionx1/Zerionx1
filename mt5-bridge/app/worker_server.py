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
WINDOWS_PYTHON = "/home/mt5/runtime/python311/python.exe"
EXEC_SCRIPT = r"Z:\app\mt5-bridge\app\worker_exec.py"

class PersistentExecutor:
    def __init__(self):
        self.lock = threading.Lock()
        self.proc: subprocess.Popen[str] | None = None
    def stop(self):
        if self.proc and self.proc.poll() is None:
            try: self.proc.terminate()
            except Exception: pass
        self.proc = None
    def start(self):
        if self.proc and self.proc.poll() is None: return
        self.stop(); env = os.environ.copy(); env.setdefault("WINEDEBUG", "-all")
        self.proc = subprocess.Popen(["wine", WINDOWS_PYTHON, EXEC_SCRIPT, "--daemon"],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1,env=env)
    def call(self, payload: dict, timeout: float = 55.0) -> dict:
        with self.lock:
            for attempt in range(2):
                self.start(); proc = self.proc
                if not proc or not proc.stdin or not proc.stdout: raise RuntimeError("MT5 persistent executor failed to start")
                try:
                    proc.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n"); proc.stdin.flush()
                    selector = selectors.DefaultSelector(); selector.register(proc.stdout, selectors.EVENT_READ); deadline = time.monotonic() + timeout
                    try:
                        while time.monotonic() < deadline:
                            events = selector.select(max(0.0, deadline - time.monotonic()))
                            if not events: break
                            line = proc.stdout.readline()
                            if line == "": raise RuntimeError("MT5 executor exited unexpectedly")
                            line = line.strip()
                            if not line: continue
                            try: data = json.loads(line)
                            except json.JSONDecodeError:
                                print(f"MT5 executor diagnostic: {line[-500:]}", flush=True); continue
                            if isinstance(data, dict): return data
                        raise TimeoutError("MT5 worker timeout")
                    finally: selector.close()
                except (BrokenPipeError, RuntimeError):
                    self.stop()
                    if attempt == 0: continue
                    raise
            raise RuntimeError("MT5 executor unavailable")

executor = PersistentExecutor()

class Handler(BaseHTTPRequestHandler):
    server_version = "ZerionMT5Worker/2.0"
    def log_message(self, fmt, *args): print("%s - %s" % (self.address_string(), fmt % args), flush=True)
    def send_json(self, status: int, data: dict):
        body = json.dumps(data, separators=(",", ":")).encode(); self.send_response(status); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(body))); self.send_header("connection", "close"); self.end_headers(); self.wfile.write(body)
    def authorized(self): return bool(TOKEN and self.headers.get("authorization") == f"Bearer {TOKEN}")
    def do_HEAD(self):
        if self.path == "/healthz": self.send_response(200); self.send_header("content-length", "0"); self.end_headers(); return
        self.send_response(404); self.send_header("content-length", "0"); self.end_headers()
    def do_GET(self):
        if self.path == "/healthz": self.send_json(200,{"ok":True,"service":"zerion-mt5-worker","executor":"warm" if executor.proc and executor.proc.poll() is None else "lazy"}); return
        self.send_json(404,{"detail":"Not found"})
    def do_POST(self):
        if self.path != "/execute": self.send_json(404,{"detail":"Not found"}); return
        if not self.authorized(): self.send_json(401,{"detail":"Unauthorized"}); return
        try:
            length=int(self.headers.get("content-length","0"));
            if length<=0 or length>1048576: raise ValueError("Invalid request size")
            payload=json.loads(self.rfile.read(length))
        except Exception as exc: self.send_json(400,{"detail":str(exc)}); return
        try:
            data=executor.call(payload); status=int(data.pop("_status",200)); self.send_json(status,data)
        except TimeoutError: executor.stop(); self.send_json(504,{"detail":"MT5 worker timeout; executor was restarted"})
        except Exception as exc: executor.stop(); self.send_json(502,{"detail":f"MT5 executor failure: {type(exc).__name__}: {exc}"})

if not TOKEN: raise RuntimeError("MT5_BRIDGE_TOKEN is not configured")
server=ThreadingHTTPServer(("0.0.0.0",PORT),Handler)
print(f"Zerion MT5 worker listening on 0.0.0.0:{PORT} (persistent executor)",flush=True)
try: server.serve_forever()
finally: executor.stop()
