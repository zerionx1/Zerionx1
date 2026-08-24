from __future__ import annotations

import json
import math
import os
import sys
import threading
import time
from typing import Any

import MetaTrader5 as mt5

TERMINAL_PATH = os.getenv("MT5_TERMINAL_PATH", "").strip() or None
MT5_LOCK = threading.RLock()
TRAILING: dict[int, dict[str, Any]] = {}


class WorkerError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def asdict(value: Any) -> dict[str, Any]:
    if hasattr(value, "_asdict"):
        return dict(value._asdict())
    return dict(value)


def fail(status: int, detail: str):
    raise WorkerError(status, detail)


def connect(credentials: dict[str, Any]):
    try:
        login = int(str(credentials["login"]))
        password = str(credentials["password"])
        server = str(credentials["server"])
    except Exception:
        fail(400, "Invalid MT5 credentials")

    kwargs = {
        "login": login,
        "password": password,
        "server": server,
        "timeout": 30000,
        "portable": True,
    }

    last_error = None
    for attempt in range(2):
        try:
            mt5.shutdown()
        except Exception:
            pass

        ok = (
            mt5.initialize(TERMINAL_PATH, **kwargs)
            if TERMINAL_PATH
            else mt5.initialize(**kwargs)
        )
        if ok:
            info = mt5.account_info()
            if info is not None:
                return info
            last_error = mt5.last_error()
        else:
            last_error = mt5.last_error()

        if attempt == 0:
            time.sleep(1.5)

    code = None
    try:
        if isinstance(last_error, (tuple, list)) and last_error:
            code = int(last_error[0])
    except Exception:
        code = None

    if code is not None and code <= -10000:
        fail(503, f"MT5 runtime/IPC unavailable: {last_error}")
    fail(401, f"MT5 login failed: {last_error}")


def ensure_symbol(symbol: str):
    info = mt5.symbol_info(symbol)
    if info is None:
        fail(404, f"MT5 symbol not found: {symbol}")
    if not info.visible and not mt5.symbol_select(symbol, True):
        fail(409, f"Could not enable MT5 symbol: {symbol}")
    return mt5.symbol_info(symbol) or info


def filling_mode(symbol: str) -> int:
    info = mt5.symbol_info(symbol)
    mode = getattr(info, "filling_mode", None) if info else None
    if mode in (mt5.ORDER_FILLING_FOK, mt5.ORDER_FILLING_IOC, mt5.ORDER_FILLING_RETURN):
        return int(mode)
    return mt5.ORDER_FILLING_IOC


def normalize_volume(symbol: str, requested: float) -> float:
    info = ensure_symbol(symbol)
    minimum = float(getattr(info, "volume_min", 0.01) or 0.01)
    maximum = float(getattr(info, "volume_max", 100.0) or 100.0)
    step = float(getattr(info, "volume_step", minimum) or minimum)
    value = max(minimum, min(maximum, requested))
    steps = math.floor((value + 1e-12) / step)
    normalized = max(minimum, min(maximum, steps * step))
    precision = max(0, min(8, int(round(-math.log10(step))) if step < 1 else 0))
    return round(normalized, precision)


def volume_from_risk(symbol: str, side: str, entry: float, stop_loss: float, risk_budget: float) -> float:
    if risk_budget <= 0 or stop_loss <= 0:
        fail(400, "risk_budget and stop_loss must be positive")
    order_type = mt5.ORDER_TYPE_BUY if side == "buy" else mt5.ORDER_TYPE_SELL
    loss_one_lot = mt5.order_calc_profit(order_type, symbol, 1.0, entry, stop_loss)
    if loss_one_lot is None:
        fail(409, f"MT5 risk sizing failed: {mt5.last_error()}")
    loss_one_lot = abs(float(loss_one_lot))
    if loss_one_lot <= 0:
        fail(409, "MT5 risk sizing returned zero loss distance")
    return normalize_volume(symbol, risk_budget / loss_one_lot)


def build_order(order: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    symbol = str(order["symbol"])
    side = str(order["side"]).lower()
    if side not in {"buy", "sell"}:
        fail(400, "side must be buy or sell")
    info = ensure_symbol(symbol)
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        fail(503, f"No MT5 tick for {symbol}")
    buy = side == "buy"
    price = float(tick.ask if buy else tick.bid)
    sl = order.get("stop_loss")
    tp = order.get("take_profit")
    if sl is not None:
        sl = float(sl)
        if (buy and sl >= price) or ((not buy) and sl <= price):
            fail(400, "Invalid stop loss for current market side")
    if tp is not None:
        tp = float(tp)
        if (buy and tp <= price) or ((not buy) and tp >= price):
            fail(400, "Invalid take profit for current market side")

    volume_value = order.get("volume")
    if volume_value is None:
        risk_budget = float(order.get("risk_budget") or 0.0)
        if sl is None:
            fail(400, "stop_loss is required for automatic risk sizing")
        volume = volume_from_risk(symbol, side, price, sl, risk_budget)
    else:
        volume = normalize_volume(symbol, float(volume_value))

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY if buy else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": sl or 0.0,
        "tp": tp or 0.0,
        "deviation": int(order.get("deviation", 20)),
        "magic": 510001,
        "comment": str(order.get("comment", "Zerion X1"))[:31],
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": filling_mode(symbol),
    }
    meta = {
        "side": side,
        "entry": price,
        "volume": volume,
        "digits": int(getattr(info, "digits", 2) or 2),
    }
    return request, meta


def register_trailing(credentials: dict[str, Any], order: dict[str, Any], result: Any, meta: dict[str, Any]):
    if not bool(order.get("auto_trailing")):
        return
    distance = float(order.get("trailing_distance") or 0.0)
    trigger = float(order.get("trailing_trigger") or 0.0)
    if distance <= 0 or trigger <= 0:
        return
    symbol = str(order["symbol"])
    positions = list(mt5.positions_get(symbol=symbol) or [])
    candidates = [p for p in positions if int(getattr(p, "magic", 0) or 0) == 510001]
    if not candidates:
        candidates = positions
    if not candidates:
        return
    pos = max(candidates, key=lambda p: int(getattr(p, "time_msc", 0) or getattr(p, "time", 0) or 0))
    ticket = int(pos.ticket)
    TRAILING[ticket] = {
        "credentials": dict(credentials),
        "symbol": symbol,
        "side": meta["side"],
        "trigger": trigger,
        "distance": distance,
        "last_stop": float(order.get("stop_loss") or 0.0),
        "take_profit": float(order.get("take_profit") or 0.0),
        "digits": meta["digits"],
    }


def trailing_loop():
    while True:
        time.sleep(2.0)
        for ticket, item in list(TRAILING.items()):
            try:
                with MT5_LOCK:
                    connect(item["credentials"])
                    rows = list(mt5.positions_get(ticket=ticket) or [])
                    if not rows:
                        TRAILING.pop(ticket, None)
                        continue
                    pos = rows[0]
                    tick = mt5.symbol_info_tick(pos.symbol)
                    if tick is None:
                        continue
                    side = item["side"]
                    current = float(tick.bid if side == "buy" else tick.ask)
                    triggered = current >= item["trigger"] if side == "buy" else current <= item["trigger"]
                    if not triggered:
                        continue
                    candidate = current - item["distance"] if side == "buy" else current + item["distance"]
                    candidate = round(candidate, item["digits"])
                    last_stop = float(item["last_stop"])
                    improves = candidate > last_stop if side == "buy" else candidate < last_stop
                    if not improves:
                        continue
                    request = {
                        "action": mt5.TRADE_ACTION_SLTP,
                        "position": ticket,
                        "symbol": pos.symbol,
                        "sl": candidate,
                        "tp": float(item["take_profit"] or getattr(pos, "tp", 0.0) or 0.0),
                        "magic": 510001,
                    }
                    result = mt5.order_send(request)
                    if result is not None and result.retcode == mt5.TRADE_RETCODE_DONE:
                        item["last_stop"] = candidate
            except Exception:
                continue
            finally:
                try:
                    mt5.shutdown()
                except Exception:
                    pass


def mt5_timeframe(value: str):
    mapping={"1m":mt5.TIMEFRAME_M1,"3m":mt5.TIMEFRAME_M3,"5m":mt5.TIMEFRAME_M5,"15m":mt5.TIMEFRAME_M15,"30m":mt5.TIMEFRAME_M30,"1h":mt5.TIMEFRAME_H1,"4h":mt5.TIMEFRAME_H4,"1d":mt5.TIMEFRAME_D1,"1w":mt5.TIMEFRAME_W1}
    return mapping.get(str(value or "15m").lower(),mt5.TIMEFRAME_M15)

def handle(payload: dict[str, Any]) -> tuple[dict[str, Any], int]:
    operation = str(payload.get("operation", ""))
    credentials = payload.get("credentials")
    if not isinstance(credentials, dict):
        fail(400, "credentials are required")
    environment = str(credentials.get("environment", "demo"))

    with MT5_LOCK:
        try:
            info = connect(credentials)
            if operation == "verify":
                return {"ok": True, "login": info.login, "server": info.server, "currency": info.currency, "environment": environment}, 200
            if operation == "account":
                result = asdict(info)
                result["environment"] = environment
                result["ok"] = True
                return result, 200
            if operation == "positions":
                rows = mt5.positions_get() or []
                return {"ok": True, "count": len(rows), "positions": [asdict(row) for row in rows]}, 200
if operation == "market_symbols":
    market = payload.get("market")
    query = str((market or {}).get("query") or "").strip().upper()
    rows = list(mt5.symbols_get() or [])
    values = []
    for row in rows:
        name = str(getattr(row, "name", "") or "")
        description = str(getattr(row, "description", "") or "")
        path = str(getattr(row, "path", "") or "")
        if query and query not in f"{name} {description} {path}".upper():
            continue
        values.append({"name":name,"description":description,"path":path,"currency_profit":str(getattr(row,"currency_profit","") or ""),"point":float(getattr(row,"point",0.0) or 0.0),"volume_min":float(getattr(row,"volume_min",0.01) or 0.01)})
        if len(values) >= 150:
            break
    return {"ok": True, "symbols": values}, 200
            if operation == "market_tick":
                market=payload.get("market")
                if not isinstance(market,dict): fail(400,"market payload is required")
                symbol=str(market.get("symbol") or "").strip(); ensure_symbol(symbol)
                tick=mt5.symbol_info_tick(symbol)
                if tick is None: fail(503,f"No MT5 tick for {symbol}: {mt5.last_error()}")
                data=asdict(tick)
                return {"ok":True,"symbol":symbol,"bid":float(data.get("bid") or 0),"ask":float(data.get("ask") or 0),"last":float(data.get("last") or data.get("bid") or data.get("ask") or 0),"time_msc":int(data.get("time_msc") or 0)},200
            if operation == "market_candles":
                market=payload.get("market")
                if not isinstance(market,dict): fail(400,"market payload is required")
                symbol=str(market.get("symbol") or "").strip(); ensure_symbol(symbol); count=max(50,min(2000,int(market.get("count") or 500)))
                rates=mt5.copy_rates_from_pos(symbol,mt5_timeframe(str(market.get("timeframe") or "15m")),0,count)
                if rates is None: fail(503,f"MT5 candles unavailable for {symbol}: {mt5.last_error()}")
                candles=[{"time":int(r["time"])*1000,"open":float(r["open"]),"high":float(r["high"]),"low":float(r["low"]),"close":float(r["close"]),"volume":float(r["tick_volume"])} for r in rates]
                return {"ok":True,"symbol":symbol,"candles":candles},200
            if operation == "order_place":
                order = payload.get("order")
                if not isinstance(order, dict):
                    fail(400, "order is required")
                request, meta = build_order(order)
                checked = mt5.order_check(request)
                if checked is None:
                    fail(409, f"MT5 order_check failed: {mt5.last_error()}")
                if getattr(checked, "retcode", 0) not in (0, mt5.TRADE_RETCODE_DONE):
                    fail(409, f"MT5 order_check rejected: {getattr(checked, 'comment', 'rejected')}")
                result = mt5.order_send(request)
                if result is None:
                    fail(503, f"MT5 order_send failed: {mt5.last_error()}")
                data = asdict(result)
                data["ok"] = result.retcode == mt5.TRADE_RETCODE_DONE
                data["environment"] = environment
                data["risk_sized_volume"] = meta["volume"]
                if data["ok"]:
                    register_trailing(credentials, order, result, meta)
                return data, 200 if data["ok"] else 409
            if operation == "order_modify":
                item = payload.get("modification")
                if not isinstance(item, dict):
                    fail(400, "modification is required")
                ticket = int(item["ticket"])
                positions = mt5.positions_get(ticket=ticket) or []
                if not positions:
                    fail(404, "MT5 position not found")
                pos = positions[0]
                request = {
                    "action": mt5.TRADE_ACTION_SLTP,
                    "position": ticket,
                    "symbol": pos.symbol,
                    "sl": float(item.get("stop_loss") or 0.0),
                    "tp": float(item.get("take_profit") or 0.0),
                    "magic": 510001,
                }
                result = mt5.order_send(request)
                if result is None:
                    fail(503, f"MT5 modify failed: {mt5.last_error()}")
                data = asdict(result)
                data["ok"] = result.retcode == mt5.TRADE_RETCODE_DONE
                if data["ok"] and ticket in TRAILING and item.get("stop_loss") is not None:
                    TRAILING[ticket]["last_stop"] = float(item["stop_loss"])
                return data, 200 if data["ok"] else 409
            if operation == "order_close":
                item = payload.get("close")
                if not isinstance(item, dict):
                    fail(400, "close is required")
                ticket = int(item["ticket"])
                positions = mt5.positions_get(ticket=ticket) or []
                if not positions:
                    fail(404, "MT5 position not found")
                pos = positions[0]
                tick = mt5.symbol_info_tick(pos.symbol)
                if tick is None:
                    fail(503, "No live tick for MT5 position")
                is_buy = pos.type == mt5.POSITION_TYPE_BUY
                request = {
                    "action": mt5.TRADE_ACTION_DEAL,
                    "position": ticket,
                    "symbol": pos.symbol,
                    "volume": float(item.get("volume") or pos.volume),
                    "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,
                    "price": tick.bid if is_buy else tick.ask,
                    "deviation": int(item.get("deviation", 20)),
                    "magic": 510001,
                    "comment": "Zerion X1 close",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": filling_mode(pos.symbol),
                }
                result = mt5.order_send(request)
                if result is None:
                    fail(503, f"MT5 close failed: {mt5.last_error()}")
                data = asdict(result)
                data["ok"] = result.retcode == mt5.TRADE_RETCODE_DONE
                if data["ok"]:
                    TRAILING.pop(ticket, None)
                return data, 200 if data["ok"] else 409
            fail(400, f"Unsupported MT5 operation: {operation}")
        finally:
            try:
                mt5.shutdown()
            except Exception:
                pass


def response(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        data, status = handle(payload)
        data["_status"] = status
        return data
    except WorkerError as exc:
        return {"ok": False, "detail": exc.detail, "_status": exc.status}
    except Exception as exc:
        return {"ok": False, "detail": f"MT5 worker exception: {type(exc).__name__}: {exc}", "_status": 500}


def daemon():
    threading.Thread(target=trailing_loop, daemon=True).start()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception:
            payload = None
        result = response(payload if isinstance(payload, dict) else {})
        print(json.dumps(result, separators=(",", ":"), ensure_ascii=False), flush=True)


def main():
    if "--daemon" in sys.argv:
        daemon()
        return
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}
    print(json.dumps(response(payload), separators=(",", ":"), ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
