# Zerion X1 Market Explorer / Search / Chart Fix

This patch is designed to be applied after the CoinDCX launch ZIP.

Key fixes:
- Search no longer depends only on the tiny static market catalog.
- Indian search calls Upstox Instrument Search using the connected user's token.
- `TATA`, `RELIANCE`, `NIFTY`, option strikes, futures and other provider instruments can resolve from Upstox.
- Crypto search reads CoinDCX market details.
- Search results are clickable and open a dedicated instrument workspace.
- Existing market cards/list rows are clickable.
- Static cards resolve to real provider IDs when opened.
- Dedicated chart workspace shows quote, OHLC/day range, provider and candles.
- Chart container is made taller so candles are not stuck at the top.
- Upstox full-quote REST is used for arbitrary searched stocks; WebSocket remains the realtime transport for subscribed/core instruments.
- CoinDCX search and live market data remain provider-backed after the CoinDCX launch patch.

Important:
A WebSocket does not replace symbol discovery. Upstox instrument search / CoinDCX market metadata are used for discovery; sockets are used for realtime streams.
