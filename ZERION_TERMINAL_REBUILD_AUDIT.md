# Zerion X1 Terminal Rebuild Audit

Base audited: current `main` after commit `e0a4343`.

## Confirmed breakages found

1. The original `CandlestickChart` is only an SVG renderer. It has no crosshair,
   volume pane, OHLC hover, zoom, pan, price scale, indicator overlays or live-price line.

2. `TradingViewAdvancedChart` embeds TradingView's external JavaScript widget.
   This is why unsupported symbols such as `COINDCX:BTCUSDT` can display
   "This symbol doesn't exist". It also means the chart is not Zerion-owned.

3. Paper trading uses that external widget and static TradingView-style symbol mappings,
   while Zerion market data is already coming from Upstox/CoinDCX.

4. The F&O Command Center is based on a static derivative universe and only shows an
   underlying reference chart. It does not retrieve live NIFTY/BANKNIFTY option
   contracts or the put/call option chain.

5. Upstox client has instrument search and candles but no Option Contracts or
   Put/Call Option Chain client methods even though Upstox supports both.

6. Strategy Studio still exposes "templates", "Customize", and draft editor flow.
   Its strategy template gallery creates IDs like
   `strategy_<slug>_<uuid>`. The database strategy ID is UUID-backed, causing the
   observed PostgreSQL `22P02 invalid input syntax for type uuid` error.

7. The dedicated chart terminal still asks users to enter TradingView symbols and
   contains hard-coded TradingView/Binance/OANDA presets instead of provider search.

## Changes in this package

### Zerion-owned professional chart

`src/components/charts/zerion-pro-chart.tsx`

- Canvas-based renderer owned by Zerion X1.
- Candles and line chart modes.
- OHLCV hover strip.
- Crosshair.
- Mouse/touch pan.
- Wheel zoom.
- Dynamic price scale.
- Live price line.
- Volume pane.
- SMA 20.
- EMA 20.
- VWAP.
- Responsive HiDPI canvas.
- No TradingView embed or chart data dependency.

### Compatibility replacement

`src/components/markets/tradingview-advanced-chart.tsx`

The old export name is retained so the rest of the repo does not break, but the
implementation is now Zerion-owned and resolves provider instruments from
`/api/markets/search`, then loads Zerion's Upstox/CoinDCX quote and candle APIs.

### Universal terminal

`src/components/markets/market-chart-terminal.tsx`

- Searches provider instruments, not static TradingView symbols.
- Any matching Upstox equity/index/F&O contract or CoinDCX pair can be selected.
- Uses the Zerion chart engine.

### Real Upstox options

- Adds Upstox Option Contracts client method.
- Adds Upstox Put/Call Option Chain client method.
- Adds `/api/markets/options`.
- Rebuilds F&O Command Center for NIFTY 50 and BANKNIFTY.
- Expiry selector.
- CE/PE option-chain table.
- LTP, OI, volume, IV where supplied by provider.
- Contract click opens the actual provider instrument chart.
- Arbitrary F&O underlying input is supported.

### Strategy repair

- Strategy IDs are now real UUIDs.
- Removes Customize/draft button from ready strategy gallery.
- "Install strategy" persists the strategy and starts its paper deployment.
- Strategy runtime remains controllable through existing enable/pause/delete controls.
- Strategy Studio copy no longer presents templates/custom builder as the main flow.

## Important boundary

This patch builds a Zerion-owned professional chart surface with the core
functionality needed for trading analysis. TradingView has many years of advanced
drawing tools, scripting, alerts and specialist studies. This package intentionally
does not claim every proprietary TradingView feature is already recreated.
It removes the broken external dependency and establishes the correct Zerion
architecture so additional drawings/studies can be added safely without changing
market-data providers.

## Verification after applying

Run in this order:

1. `npx prettier --write src`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `git diff --check`
6. `python ~/zerion-terminal-rebuild/scripts/audit-runtime.py`

Then verify live:

- Search `TATA`, `RELIANCE`, `TCS`.
- Search/open NIFTY 50 and BANKNIFTY.
- Open F&O and switch NIFTY/BANKNIFTY expiries.
- Click a CE and PE contract and confirm its own chart opens.
- Open BTC/USDT and ETH/USDT and confirm CoinDCX candles render.
- Paper page must render Zerion's chart, not an external TradingView widget.
- Install a ready strategy; there must be no UUID `22P02` error.
