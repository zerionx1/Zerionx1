from __future__ import annotations

import hashlib
import os
import threading
from typing import Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import MetaTrader5 as mt5

app = FastAPI(title="Zerion X1 Multi-User MT5 Bridge", version="2.0.0")
BRIDGE_TOKEN = os.getenv("MT5_BRIDGE_TOKEN", "").strip()
TERMINAL_PATH = os.getenv("MT5_TERMINAL_PATH", "").strip() or None
lock = threading.RLock()
seen: dict[str, dict] = {}

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

class Order(BaseModel):
    symbol: str = Field(min_length=2, max_length=32)
    side: Literal["buy", "sell"]
    volume: float = Field(gt=0, le=100)
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    deviation: int = Field(default=20, ge=0, le=100)
    comment: str = Field(default="Zerion X1", max_length=31)

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

def asdict(value):
    return value._asdict() if hasattr(value, "_asdict") else dict(value)

def connect(credentials: Credentials):
    kwargs = {"login": int(credentials.login), "password": credentials.password, "server": credentials.server}
    ok = mt5.initialize(TERMINAL_PATH, **kwargs) if TERMINAL_PATH else mt5.initialize(**kwargs)
    if not ok:
        raise HTTPException(401, f"MT5 login failed: {mt5.last_error()}")
    info = mt5.account_info()
    if info is None:
        raise HTTPException(401, "MT5 account_info failed after login")
    return info

def ensure_symbol(symbol: str):
    info = mt5.symbol_info(symbol)
    if info is None:
        raise HTTPException(404, f"MT5 symbol not found: {symbol}")
    if not info.visible and not mt5.symbol_select(symbol, True):
        raise HTTPException(409, f"Could not enable MT5 symbol: {symbol}")

def order_request(order: Order):
    ensure_symbol(order.symbol)
    tick = mt5.symbol_info_tick(order.symbol)
    if tick is None:
        raise HTTPException(503, f"No MT5 tick for {order.symbol}")
    buy = order.side == "buy"
    price = tick.ask if buy else tick.bid
    if order.stop_loss is not None and ((buy and order.stop_loss >= price) or ((not buy) and order.stop_loss <= price)):
        raise HTTPException(400, "Invalid stop loss for current market side")
    if order.take_profit is not None and ((buy and order.take_profit <= price) or ((not buy) and order.take_profit >= price)):
        raise HTTPException(400, "Invalid take profit for current market side")
    return {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": order.symbol,
        "volume": order.volume,
        "type": mt5.ORDER_TYPE_BUY if buy else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": order.stop_loss or 0.0,
        "tp": order.take_profit or 0.0,
        "deviation": order.deviation,
        "magic": 510001,
        "comment": order.comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

@app.get("/health", dependencies=[Depends(auth)])
def health():
    return {"ok": True, "service": "zerion-mt5-bridge", "mode": "multi-user"}

@app.post("/session/verify", dependencies=[Depends(auth)])
def verify(payload: CredentialsRequest):
    with lock:
        info = connect(payload.credentials)
        result = {"ok": True, "login": info.login, "server": info.server, "currency": info.currency, "environment": payload.credentials.environment}
        mt5.shutdown()
        return result

@app.post("/account", dependencies=[Depends(auth)])
def account(payload: CredentialsRequest):
    with lock:
        info = connect(payload.credentials)
        result = asdict(info)
        result["environment"] = payload.credentials.environment
        mt5.shutdown()
        return result

@app.post("/positions", dependencies=[Depends(auth)])
def positions(payload: CredentialsRequest):
    with lock:
        connect(payload.credentials)
        rows = mt5.positions_get() or []
        result = {"count": len(rows), "positions": [asdict(row) for row in rows]}
        mt5.shutdown()
        return result

@app.post("/order/place", dependencies=[Depends(auth)])
def place(payload: OrderRequest, x_idempotency_key: str | None = Header(default=None)):
    if not x_idempotency_key:
        raise HTTPException(400, "x-idempotency-key is required")
    key = hashlib.sha256(x_idempotency_key.encode()).hexdigest()
    if key in seen:
        return seen[key]
    with lock:
        connect(payload.credentials)
        request = order_request(payload.order)
        checked = mt5.order_check(request)
        if checked is None:
            mt5.shutdown()
            raise HTTPException(409, f"MT5 order_check failed: {mt5.last_error()}")
        result = mt5.order_send(request)
        if result is None:
            mt5.shutdown()
            raise HTTPException(503, f"MT5 order_send failed: {mt5.last_error()}")
        data = asdict(result)
        data["ok"] = result.retcode == mt5.TRADE_RETCODE_DONE
        data["environment"] = payload.credentials.environment
        seen[key] = data
        mt5.shutdown()
        return data

@app.post("/order/modify", dependencies=[Depends(auth)])
def modify(payload: ModifyRequest):
    with lock:
        connect(payload.credentials)
        item = payload.modification
        positions = mt5.positions_get(ticket=item.ticket) or []
        if not positions:
            mt5.shutdown()
            raise HTTPException(404, "MT5 position not found")
        pos = positions[0]
        request = {"action": mt5.TRADE_ACTION_SLTP, "position": item.ticket, "symbol": pos.symbol, "sl": item.stop_loss or 0.0, "tp": item.take_profit or 0.0, "magic": 510001}
        result = mt5.order_send(request)
        if result is None:
            mt5.shutdown()
            raise HTTPException(503, "MT5 modify failed")
        data = asdict(result)
        mt5.shutdown()
        return data

@app.post("/order/close", dependencies=[Depends(auth)])
def close(payload: CloseRequest):
    with lock:
        connect(payload.credentials)
        item = payload.close
        positions = mt5.positions_get(ticket=item.ticket) or []
        if not positions:
            mt5.shutdown()
            raise HTTPException(404, "MT5 position not found")
        pos = positions[0]
        tick = mt5.symbol_info_tick(pos.symbol)
        if tick is None:
            mt5.shutdown()
            raise HTTPException(503, "No live tick for MT5 position")
        is_buy = pos.type == mt5.POSITION_TYPE_BUY
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "position": item.ticket,
            "symbol": pos.symbol,
            "volume": item.volume or pos.volume,
            "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,
            "price": tick.bid if is_buy else tick.ask,
            "deviation": item.deviation,
            "magic": 510001,
            "comment": "Zerion X1 close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = mt5.order_send(request)
        if result is None:
            mt5.shutdown()
            raise HTTPException(503, "MT5 close failed")
        data = asdict(result)
        mt5.shutdown()
        return data
