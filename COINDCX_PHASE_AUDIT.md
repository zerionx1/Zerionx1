# Zerion X1 CoinDCX Launch Phase

Prepared against `zerionx1/Zerionx1` main after the Upstox end-to-end commit.

## Repo findings

Before this phase:
- CoinDCX was `coming-soon`.
- Crypto market IDs were `binance:*`.
- `quote-store` fell back to Binance REST.
- `use-binance-market-stream.ts` opened `wss://stream.binance.com`.
- Render worker only started Upstox.
- Crypto did not have an account/balance API or portfolio section.

## This phase

- Activates CoinDCX in Trading Connections.
- Verifies configured API key + secret through CoinDCX authenticated User Info.
- Encrypts the credentials into the existing `broker_connections` token envelope.
- Supports the existing Disconnect Account flow.
- Adds Node-safe CoinDCX REST/HMAC core.
- Adds worker-side encrypted connection loading.
- Uses CoinDCX Socket.IO endpoint `wss://stream.coindcx.com`.
- Public realtime channels:
  - B-BTC_USDT@trades
  - B-ETH_USDT@trades
  - B-SOL_USDT@trades
- Private authenticated `coindcx` channel for account events.
- Replaces Binance crypto IDs/exchange labels with CoinDCX.
- Removes Binance REST fallback from quote-store.
- Converts the old Binance hook into a compatibility wrapper over Zerion's own realtime gateway; it no longer connects to Binance.
- Adds CoinDCX candles to the existing instrument candle route.
- Adds CoinDCX wallet balances to Unified Portfolio.
- Adds Upstox + CoinDCX provider-specific health inside the single Render worker.

## Environment

Already stored locally by the owner:
- COINDCX_API_KEY
- COINDCX_API_SECRET

They must be added to Vercel Production and Render before the CoinDCX Connect button is used.

Existing shared env remains required:
- BROKER_TOKEN_ENCRYPTION_KEY
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ZERION_MARKET_DATA_BASE_URL (optional; defaults to Render URL)

## Dependency

CoinDCX documents Socket.IO for its stream endpoint. `apply.sh` installs:
- socket.io-client@2.4.0

The direct Binance browser socket is no longer used.

## Verification sequence

1. Apply ZIP.
2. npm run typecheck
3. npm test
4. npm run build
5. git diff --check
6. Sync COINDCX_API_KEY + COINDCX_API_SECRET to Vercel and Render.
7. Push/deploy both services.
8. Open Trading Connections -> Crypto -> CoinDCX -> Link existing account.
9. Verify Render:
   - /health providers.coindcx
   - /quote?symbol=BTC%2FUSDT
10. Verify Vercel:
   - /api/market-data/health
   - Markets -> Crypto
   - Portfolio -> CoinDCX wallet

## Security note

No API key or secret is included in this ZIP.
The connection row stores only an AES-GCM encrypted envelope using the existing Zerion broker vault key.
