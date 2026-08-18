# Zerion X1 Phase 12 — Multi-Market Connectivity + Paper Trading

## Delivered
- Indian broker catalog: Upstox, Angel One, DhanHQ, Groww.
- Crypto catalog: Binance, Coinbase Advanced, Kraken, OKX.
- FX integration paths: OANDA v20, MT5 bridge, MT4 bridge, Interactive Brokers.
- Provider/broker connection center wired to the existing `/api/brokers` endpoint.
- Official TradingView Advanced Chart widget for the visual charting surface.
- Public Binance browser WebSocket stream for BTC/USDT and ETH/USDT.
- Paper positions are marked against available provider quotes instead of remaining stuck at fill price.
- Paper terminal displays live unrealized P&L for supported live streams.
- Six strategy templates added to Strategy Studio.
- No synthetic Indian/FX fills are introduced.

## Important architecture boundary
TradingView's free widget is used as a charting surface. It is not used as an unofficial scraped backend WebSocket. TradingView's charting library expects Zerion to supply its own datafeed. For crypto, this patch uses Binance's public market stream. For Indian and FX P&L/execution, connect an authorized provider.

MT4/MT5 are terminal platforms/bridges, not universal brokers. Zerion's bridge must connect to a compatible broker terminal/account.

## Environment variables still required for live broker connections
The existing broker API reads server-side configuration such as:

- `BROKER_UPSTOX_OAUTH_URL`
- provider client IDs/secrets/tokens
- `NEXT_PUBLIC_APP_URL`
- optional `ZERION_MARKET_DATA_BASE_URL`
- optional `ZERION_MARKET_DATA_API_KEY`

Do not put broker secret keys into browser-side `NEXT_PUBLIC_*` variables.

## Apply
Unzip directly into the Zerion X1 repository, then:

```bash
chmod +x APPLY_PHASE_12.sh
./APPLY_PHASE_12.sh
```
