# Zerion X1 production integration build

This build removes runtime use of seeded paper accounts, hard-coded watchlists, hard-coded alerts, in-memory portfolios, in-memory backtests, and in-memory runtime strategies. User-owned state is persisted in Supabase under row-level security.

## Required deployment step
Run `supabase/migrations/20260806_production_core.sql` in the Supabase SQL editor before deploying this build.

## Real market data
No sample-price fallback is used by runtime paper orders or backtests. Crypto USDT pairs can read public Binance market data. Indian equities, indices, and forex require a configured licensed gateway through `ZERION_MARKET_DATA_BASE_URL` and optional `ZERION_MARKET_DATA_API_KEY`. When unavailable, APIs return an explicit 503 rather than fabricated data.

## Implemented persistence
Profiles, workspace preferences, watchlists, price alerts, strategies, strategy versions, backtest results, paper accounts, paper orders, paper positions, portfolio snapshots, and activity schema are included with owner-only RLS.

## Verification boundary
Compilation and tests validate code behavior. Real broker execution is intentionally disabled until an approved broker application and credentials are supplied. No software can guarantee trading profit or zero loss.
