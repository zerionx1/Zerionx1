from __future__ import annotations

import json
import os
import sys
from typing import Any

import MetaTrader5 as mt5

TERMINAL_PATH = os.getenv("MT5_TERMINAL_PATH", "").strip() or None


def output(data: dict[str, Any], status: int = 200) -> None:
    data["_status"] = status
    print(json.dumps(data, separators=(",", ":"), ensure_ascii=False), flush=True)


def fail(status: int, detail: str) -> None:
    output({"ok": False, "detail": detail}, status)
    raise SystemExit(0)


def asdict(value: Any) -> dict[str, Any]:
    if hasattr(value, "_asdict"):
        return dict(value._asdict())
    return dict(value)


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

    if TERMINAL_PATH:
        ok = mt5.initialize(TERMINAL_PATH, **kwargs)
    else:
        ok = mt5.initialize(**kwargs)

    if not ok:
        fail(401, f"MT5 login failed: {mt5.last_error()}")

    info = mt5.account_info()

    if info is None:
        fail(401, "MT5 account_info failed after login")

    return info


def ensure_symbol(symbol: str) -> None:
    info = mt5.symbol_info(symbol)

    if info is None:
        fail(404, f"MT5 symbol not found: {symbol}")

    if not info.visible and not mt5.symbol_select(symbol, True):
        fail(409, f"Could not enable MT5 symbol: {symbol}")


def build_order(order: dict[str, Any]) -> dict[str, Any]:
    symbol = str(order["symbol"])
    side = str(order["side"]).lower()
    volume = float(order["volume"])

    if side not in {"buy", "sell"}:
        fail(400, "side must be buy or sell")

    if volume <= 0 or volume > 100:
        fail(400, "Invalid order volume")

    ensure_symbol(symbol)

    tick = mt5.symbol_info_tick(symbol)

    if tick is None:
        fail(503, f"No MT5 tick for {symbol}")

    buy = side == "buy"
    price = tick.ask if buy else tick.bid

    stop_loss = order.get("stop_loss")
    take_profit = order.get("take_profit")

    if stop_loss is not None:
        stop_loss = float(stop_loss)

        if (buy and stop_loss >= price) or ((not buy) and stop_loss <= price):
            fail(400, "Invalid stop loss for current market side")

    if take_profit is not None:
        take_profit = float(take_profit)

        if (buy and take_profit <= price) or ((not buy) and take_profit >= price):
            fail(400, "Invalid take profit for current market side")

    return {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY if buy else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": stop_loss or 0.0,
        "tp": take_profit or 0.0,
        "deviation": int(order.get("deviation", 20)),
        "magic": 510001,
        "comment": str(order.get("comment", "Zerion X1"))[:31],
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        fail(400, "Invalid worker JSON")

    operation = str(payload.get("operation", ""))

    credentials = payload.get("credentials")

    if not isinstance(credentials, dict):
        fail(400, "credentials are required")

    environment = str(credentials.get("environment", "demo"))

    try:
        info = connect(credentials)

        if operation == "verify":
            output({
                "ok": True,
                "login": info.login,
                "server": info.server,
                "currency": info.currency,
                "environment": environment,
            })
            return

        if operation == "account":
            result = asdict(info)
            result["environment"] = environment
            output(result)
            return

        if operation == "positions":
            rows = mt5.positions_get() or []

            output({
                "count": len(rows),
                "positions": [asdict(row) for row in rows],
            })
            return

        if operation == "order_place":
            order = payload.get("order")

            if not isinstance(order, dict):
                fail(400, "order is required")

            request = build_order(order)

            checked = mt5.order_check(request)

            if checked is None:
                fail(
                    409,
                    f"MT5 order_check failed: {mt5.last_error()}",
                )

            result = mt5.order_send(request)

            if result is None:
                fail(
                    503,
                    f"MT5 order_send failed: {mt5.last_error()}",
                )

            data = asdict(result)
            data["ok"] = result.retcode == mt5.TRADE_RETCODE_DONE
            data["environment"] = environment

            output(data)
            return

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
                fail(
                    503,
                    f"MT5 modify failed: {mt5.last_error()}",
                )

            output(asdict(result))
            return

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
                "type": (
                    mt5.ORDER_TYPE_SELL
                    if is_buy
                    else mt5.ORDER_TYPE_BUY
                ),
                "price": tick.bid if is_buy else tick.ask,
                "deviation": int(item.get("deviation", 20)),
                "magic": 510001,
                "comment": "Zerion X1 close",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }

            result = mt5.order_send(request)

            if result is None:
                fail(
                    503,
                    f"MT5 close failed: {mt5.last_error()}",
                )

            output(asdict(result))
            return

        fail(400, f"Unsupported MT5 operation: {operation}")

    finally:
        try:
            mt5.shutdown()
        except Exception:
            pass


if __name__ == "__main__":
    main()
