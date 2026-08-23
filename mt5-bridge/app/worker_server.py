from __future__ import annotations

import json
import os
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.getenv("MT5_BRIDGE_TOKEN", "").strip()
PORT = int(os.getenv("PORT", "10000"))

WINDOWS_PYTHON = "/home/mt5/runtime/python311/python.exe"
EXEC_SCRIPT = r"Z:\app\mt5-bridge\app\worker_exec.py"

lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    server_version = "ZerionMT5Worker/1.0"

    def log_message(self, fmt, *args):
        print(
            "%s - %s"
            % (
                self.address_string(),
                fmt % args,
            ),
            flush=True,
        )

    def send_json(self, status: int, data: dict):
        body = json.dumps(
            data,
            separators=(",", ":"),
        ).encode()

        self.send_response(status)
        self.send_header(
            "content-type",
            "application/json",
        )
        self.send_header(
            "content-length",
            str(len(body)),
        )
        self.send_header(
            "connection",
            "close",
        )
        self.end_headers()
        self.wfile.write(body)

    def authorized(self) -> bool:
        return (
            TOKEN
            and self.headers.get("authorization")
            == f"Bearer {TOKEN}"
        )

    def do_HEAD(self):
        if self.path == "/healthz":
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", "0")
            self.send_header("connection", "close")
            self.end_headers()
            return

        self.send_response(404)
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/healthz":
            self.send_json(
                200,
                {
                    "ok": True,
                    "service": "zerion-mt5-worker",
                },
            )
            return

        self.send_json(404, {"detail": "Not found"})

    def do_POST(self):
        if self.path != "/execute":
            self.send_json(404, {"detail": "Not found"})
            return

        if not self.authorized():
            self.send_json(
                401,
                {"detail": "Unauthorized"},
            )
            return

        try:
            length = int(
                self.headers.get(
                    "content-length",
                    "0",
                )
            )

            if length <= 0 or length > 1048576:
                raise ValueError(
                    "Invalid request size"
                )

            payload = json.loads(
                self.rfile.read(length)
            )

        except Exception as exc:
            self.send_json(
                400,
                {"detail": str(exc)},
            )
            return

        try:
            with lock:
                proc = subprocess.run(
                    [
                        "wine",
                        WINDOWS_PYTHON,
                        EXEC_SCRIPT,
                    ],
                    input=json.dumps(payload),
                    text=True,
                    capture_output=True,
                    timeout=55,
                    env=os.environ.copy(),
                )

            if proc.returncode != 0:
                self.send_json(
                    502,
                    {
                        "detail": (
                            proc.stderr.strip()
                            or "MT5 worker process failed"
                        )[-2000:]
                    },
                )
                return

            lines = [
                line
                for line in proc.stdout.splitlines()
                if line.strip()
            ]

            if not lines:
                self.send_json(
                    502,
                    {
                        "detail":
                        "MT5 worker returned no response"
                    },
                )
                return

            data = json.loads(lines[-1])

            status = int(
                data.pop("_status", 200)
            )

            self.send_json(status, data)

        except subprocess.TimeoutExpired:
            self.send_json(
                504,
                {"detail": "MT5 worker timeout"},
            )

        except Exception as exc:
            self.send_json(
                500,
                {"detail": str(exc)},
            )


if not TOKEN:
    raise RuntimeError(
        "MT5_BRIDGE_TOKEN is not configured"
    )


server = ThreadingHTTPServer(
    ("0.0.0.0", PORT),
    Handler,
)

print(
    f"Zerion MT5 worker listening on 0.0.0.0:{PORT}",
    flush=True,
)

server.serve_forever()
