# Zerion X1 End-to-End Production Audit

This package was prepared against the current `main` branch of `zerionx1/Zerionx1`.

## What was broken

1. Broker connection state and portfolio state were separate.
   - Upstox showed Connected on `/dashboard/brokers`.
   - Portfolio components were hardcoded to `Not connected`.
   - `/api/portfolio` only returned saved snapshots and did not query Upstox.

2. Market Explorer was not using the Upstox realtime worker.
   - `quoteStore` only tried a generic optional URL and Binance.
   - The Render worker only logged ticks; it did not expose quotes to Zerion.
   - Multi Market Explorer therefore showed `Connect licensed provider`.

3. Candles were fake or empty.
   - `/api/markets/[instrumentId]/candles` generated sample candles.
   - `/api/market-data/candles` returned `provider_not_connected`.
   - `MarketChartPanel` displayed `Sample data`.

4. Realtime worker could be killed by one stale encrypted broker row.
   - A single old `token_envelope` caused AES-GCM decryption to throw.
   - The complete worker then started with zero accounts/sockets.

5. Realtime worker was not a gateway.
   - It had `/health` only.
   - It did not expose `/quote`, `/quotes` or an inbound `/realtime` WebSocket for Zerion clients.

6. Product direction was stale.
   - cTrader was still advertised as the active Forex connector.
   - Final V1 direction is MT5 Bridge.
   - Crypto V1 direction is CoinDCX.

## What this ZIP fixes

- Skips stale broker envelopes instead of taking down all Upstox sessions.
- Deduplicates connected Upstox rows per owner, newest first.
- Render worker becomes a read-only Zerion market gateway:
  - `/health`
  - `/quote?symbol=NIFTY%2050`
  - `/quotes?symbols=NIFTY%2050,BANKNIFTY`
  - `/realtime` WebSocket broadcast
- Live initial Upstox subscription set:
  - NIFTY 50
  - BANK NIFTY
  - RELIANCE
  - TCS
  - HDFCBANK
- Live quote normalization includes LTP, previous close, change %, bid/ask and volume where the V3 frame provides them.
- Render socket reconnects after closure/error.
- Vercel `quoteStore` reads the Render gateway, so Market Explorer gets real Upstox quotes.
- Portfolio API queries the connected user's Upstox funds, positions and holdings.
- Portfolio summary and positions UI no longer contain hardcoded `Not connected`.
- NIFTY candle route uses current Upstox V3 intraday candle API instead of sample data.
- `MarketChartPanel` stops showing sample candles.
- Market-data health API reflects the Render worker.
- Active broker catalog removes cTrader from the current V1 direction and exposes MT5/CoinDCX as the next connectors rather than pretending they are live.

## Deliberately NOT faked

Generic `NIFTY FUT`, `NIFTY OPT`, `GOLD` and `CRUDEOIL` entries are not concrete tradable contracts. Their instrument keys change with contract/expiry. Zerion should use Upstox Instrument Search / BOD instruments to select an exact FUT/CE/PE/MCX contract before subscribing or requesting candles. This package does not invent a price for a generic contract.

CoinDCX and MT5 are not implemented by this ZIP. They remain the next connector phases after the Upstox end-to-end path is verified.

## Required existing environment

Vercel:
- `BROKER_TOKEN_ENCRYPTION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- optional `ZERION_MARKET_DATA_BASE_URL` (defaults to `https://zerionx1.onrender.com`)

Render:
- `BROKER_TOKEN_ENCRYPTION_KEY` (same value as Vercel)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- Start command: `npm run start:realtime`
- Health path: `/health`

No secret is included in this ZIP.

## Verification after apply

Run:
- `npx prettier --write` on the changed TS/TSX files
- `npm run typecheck`
- `npm test`
- `git diff --check`
- commit/push
- deploy Vercel + Render

Then verify:
- `https://zerionx1.onrender.com/health`
- `https://zerionx1.onrender.com/quote?symbol=NIFTY%2050`
- `https://zerionx1.vercel.app/api/market-data/health`
- Portfolio page
- Markets → Indices / Indian Equity

A healthy worker should report at least one decryptable account and one active socket. Live ticks depend on the Upstox token/session and provider market availability.
