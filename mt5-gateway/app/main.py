from __future__ import annotations

import hashlib
import json
import os
import threading
import urllib.error
import urllib.request
from typing import Literal, Optional

from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
)
from pydantic import BaseModel, Field


app = FastAPI(
    title="Zerion X1 MT5 Gateway",
    version="3.0.0",
)

BRIDGE_TOKEN = os.getenv(
    "MT5_BRIDGE_TOKEN",
    "",
).strip()

WORKER_URL = os.getenv(
    "MT5_WORKER_URL",
    "",
).strip().rstrip("/")

seen: dict[str, dict] = {}
seen_lock = threading.Lock()


def auth(
    authorization: str | None = Header(default=None),
):
    if not BRIDGE_TOKEN:
        raise HTTPException(
            503,
            "MT5_BRIDGE_TOKEN is not configured",
        )

    if authorization != f"Bearer {BRIDGE_TOKEN}":
        raise HTTPException(
            401,
            "Unauthorized",
        )


class Credentials(BaseModel):
    login: str = Field(
        min_length=1,
        max_length=32,
    )

    password: str = Field(
        min_length=1,
        max_length=256,
    )

    server: str = Field(
        min_length=2,
        max_length=128,
    )

    environment: Literal[
        "demo",
        "real",
    ] = "demo"


class CredentialsRequest(BaseModel):
    credentials: Credentials


class Order(BaseModel):
    symbol: str = Field(
        min_length=2,
        max_length=32,
    )

    side: Literal[
        "buy",
        "sell",
    ]

    volume: float = Field(
        gt=0,
        le=100,
    )

    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

    deviation: int = Field(
        default=20,
        ge=0,
        le=100,
    )

    comment: str = Field(
        default="Zerion X1",
        max_length=31,
    )


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

    volume: Optional[float] = Field(
        default=None,
        gt=0,
    )

    deviation: int = Field(
        default=20,
        ge=0,
        le=100,
    )


class CloseRequest(CredentialsRequest):
    close: Close


def worker_call(
    operation: str,
    credentials: Credentials,
    extra: dict | None = None,
) -> dict:

    if not WORKER_URL:
        raise HTTPException(
            503,
            "MT5_WORKER_URL is not configured",
        )

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
            "authorization":
            f"Bearer {BRIDGE_TOKEN}",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=60,
        ) as response:

            return json.loads(
                response.read().decode()
            )

    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(
                exc.read().decode()
            )
        except Exception:
            body = {}

        raise HTTPException(
            exc.code,
            body.get(
                "detail",
                f"MT5 worker error ({exc.code})",
            ),
        )

    except urllib.error.URLError as exc:
        raise HTTPException(
            503,
            f"MT5 worker unavailable: {exc.reason}",
        )

    except TimeoutError:
        raise HTTPException(
            504,
            "MT5 worker timeout",
        )


@app.api_route(
    "/healthz",
    methods=["GET", "HEAD"],
)
def healthz():
    return {
        "ok": True,
        "service": "zerion-mt5-gateway",
    }


@app.get(
    "/health",
    dependencies=[Depends(auth)],
)
def health():
    return {
        "ok": True,
        "service": "zerion-mt5-gateway",
        "mode": "production-split",
        "workerConfigured": bool(WORKER_URL),
    }


@app.post(
    "/session/verify",
    dependencies=[Depends(auth)],
)
def verify(payload: CredentialsRequest):
    return worker_call(
        "verify",
        payload.credentials,
    )


@app.post(
    "/account",
    dependencies=[Depends(auth)],
)
def account(payload: CredentialsRequest):
    return worker_call(
        "account",
        payload.credentials,
    )


@app.post(
    "/positions",
    dependencies=[Depends(auth)],
)
def positions(payload: CredentialsRequest):
    return worker_call(
        "positions",
        payload.credentials,
    )


@app.post(
    "/order/place",
    dependencies=[Depends(auth)],
)
def order_place(
    payload: OrderRequest,
    x_idempotency_key: str | None = Header(
        default=None
    ),
):
    if not x_idempotency_key:
        raise HTTPException(
            400,
            "x-idempotency-key is required",
        )

    key = hashlib.sha256(
        x_idempotency_key.encode()
    ).hexdigest()

    with seen_lock:
        if key in seen:
            return seen[key]

    result = worker_call(
        "order_place",
        payload.credentials,
        {
            "order":
            payload.order.model_dump()
        },
    )

    with seen_lock:
        seen[key] = result

    return result


@app.post(
    "/order/modify",
    dependencies=[Depends(auth)],
)
def order_modify(payload: ModifyRequest):
    return worker_call(
        "order_modify",
        payload.credentials,
        {
            "modification":
            payload.modification.model_dump()
        },
    )


@app.post(
    "/order/close",
    dependencies=[Depends(auth)],
)
def order_close(payload: CloseRequest):
    return worker_call(
        "order_close",
        payload.credentials,
        {
            "close":
            payload.close.model_dump()
        },
    )
