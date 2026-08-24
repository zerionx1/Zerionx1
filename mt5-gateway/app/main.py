from __future__ import annotations

import hashlib
import json
import os
import threading
import time
import urllib.error
import urllib.request
from typing import Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, model_validator

app = FastAPI(title="Zerion X1 MT5 Gateway", version="4.1.0")

BRIDGE_TOKEN = os.getenv("MT5_BRIDGE_TOKEN", "").strip()
WORKER_URL = os.getenv("MT5_WORKER_URL", "").strip().rstrip("/")
seen: dict[str, dict] = {}
seen_lock = threading.Lock()


def auth(authorization: str | None = Header(default=None)):
    if not BRIDGE_TOKEN:
        raise HTTPException(503, "MT5_BRIDGE_TOKEN is not configured")
    if authorization != f"Bearer {BRIDGE_TOKEN}":
        raise HTTPException(401, "Unauthorized")


class Credentials(BaseModel):
    login: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=256)
    server: str = Field(min_length=2, max_length=128)
    environment: Literal["demo", "real"] = "demo"


class CredentialsRequest(BaseModel):
    credentials: Credentials

class Market(BaseModel):
    symbol: str = ""
    query: str = ""
    timeframe: str = "15m"
    count: int = Field(default=500, ge=50, le=2000)

class MarketRequest(CredentialsRequest):
    market: Market


class Order(BaseModel):
    symbol: str = Field(min_length=2, max_length=32)
    side: Literal["buy", "sell"]
    volume: Optional[float] = Field(default=None, gt=0, le=100)
    risk_budget: Optional[float] = Field(default=None, gt=0)
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    deviation: int = Field(default=20, ge=0, le=100)
    comment: str = Field(default="Zerion X1", max_length=31)
    auto_trailing: bool = False
    trailing_trigger: Optional[float] = None
    trailing_distance: Optional[float] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_sizing(self):
        if self.volume is None and self.risk_budget is None:
            raise ValueError("volume or risk_budget is required")
        if self.risk_budget is not None and self.stop_loss is None:
            raise ValueError("stop_loss is required when risk_budget is used")
        if self.auto_trailing and self.trailing_distance is None:
            raise ValueError("trailing_distance is required for auto trailing")
        return self


class OrderRequest(CredentialsRequest):
    order: Order


class Modification(BaseModel):
    ticket: int = Field(gt=0)
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class ModifyRequest(CredentialsRequest):
    modification: Modification


class Close(BaseModel):
    ticket: int = Field(gt=0)
    volume: Optional[float] = Field(default=None, gt=0)
    deviation: int = Field(default=20, ge=0, le=100)


class CloseRequest(CredentialsRequest):
    close: Close


def _worker_once(operation: str, credentials: Credentials, extra: dict | None = None) -> dict:
    if not WORKER_URL:
        raise HTTPException(503, "MT5_WORKER_URL is not configured")

    payload = {
        "operation": operation,
        "credentials": credentials.model_dump(),
        **(extra or {}),
    }
    request = urllib.request.Request(
        f"{WORKER_URL}/execute",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {BRIDGE_TOKEN}",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode())
        except Exception:
            body = {}
        raise HTTPException(
            exc.code,
            body.get("detail", f"MT5 worker error ({exc.code})"),
        )
    except urllib.error.URLError as exc:
        raise HTTPException(503, f"MT5 worker unavailable: {exc.reason}")
    except TimeoutError:
        raise HTTPException(504, "MT5 worker timeout")


def worker_call(operation: str, credentials: Credentials, extra: dict | None = None) -> dict:
    # Only idempotent/read operations get one transient retry.
    # Order mutation endpoints are not retried here.
    retryable = operation in {"verify", "account", "positions", "market_symbols", "market_tick", "market_candles"}
    attempts = 2 if retryable else 1
    last: HTTPException | None = None

    for attempt in range(attempts):
        try:
            return _worker_once(operation, credentials, extra)
        except HTTPException as exc:
            last = exc
            if attempt + 1 >= attempts or exc.status_code not in {502, 503, 504}:
                raise
            time.sleep(1.5)

    raise last or HTTPException(503, "MT5 worker unavailable")


def worker_probe() -> dict:
    if not WORKER_URL:
        return {"configured": False, "reachable": False}
    try:
        request = urllib.request.Request(f"{WORKER_URL}/healthz", method="GET")
        with urllib.request.urlopen(request, timeout=5) as response:
            body = json.loads(response.read().decode())
            return {
                "configured": True,
                "reachable": response.status == 200,
                "executor": body.get("executor"),
            }
    except Exception:
        return {"configured": True, "reachable": False}


@app.api_route("/healthz", methods=["GET", "HEAD"])
def healthz():
    return {"ok": True, "service": "zerion-mt5-gateway", "version": "4.1.0"}


@app.get("/health", dependencies=[Depends(auth)])
def health():
    probe = worker_probe()
    return {
        "ok": True,
        "service": "zerion-mt5-gateway",
        "mode": "production-split",
        "workerConfigured": bool(WORKER_URL),
        "workerReachable": probe.get("reachable", False),
        "workerExecutor": probe.get("executor"),
    }


@app.post("/session/verify", dependencies=[Depends(auth)])
def verify(payload: CredentialsRequest):
    return worker_call("verify", payload.credentials)


@app.post("/account", dependencies=[Depends(auth)])
def account(payload: CredentialsRequest):
    return worker_call("account", payload.credentials)


@app.post("/positions", dependencies=[Depends(auth)])
def positions(payload: CredentialsRequest):
    return worker_call("positions", payload.credentials)

@app.post("/market/symbols", dependencies=[Depends(auth)])
def market_symbols(payload: MarketRequest):
    return worker_call(
        "market_symbols",
        payload.credentials,
        {"market": payload.market.model_dump()},
    )


@app.post("/market/tick", dependencies=[Depends(auth)])
def market_tick(payload: MarketRequest):
    return worker_call("market_tick", payload.credentials, {"market": payload.market.model_dump()})

@app.post("/market/candles", dependencies=[Depends(auth)])
def market_candles(payload: MarketRequest):
    return worker_call("market_candles", payload.credentials, {"market": payload.market.model_dump()})


@app.post("/order/place", dependencies=[Depends(auth)])
def order_place(
    payload: OrderRequest,
    x_idempotency_key: str | None = Header(default=None),
):
    if not x_idempotency_key:
        raise HTTPException(400, "x-idempotency-key is required")
    key = hashlib.sha256(x_idempotency_key.encode()).hexdigest()
    with seen_lock:
        if key in seen:
            return seen[key]
    result = worker_call(
        "order_place",
        payload.credentials,
        {"order": payload.order.model_dump()},
    )
    with seen_lock:
        seen[key] = result
    return result


@app.post("/order/modify", dependencies=[Depends(auth)])
def order_modify(payload: ModifyRequest):
    return worker_call(
        "order_modify",
        payload.credentials,
        {"modification": payload.modification.model_dump()},
    )


@app.post("/order/close", dependencies=[Depends(auth)])
def order_close(payload: CloseRequest):
    return worker_call(
        "order_close",
        payload.credentials,
        {"close": payload.close.model_dump()},
    )
