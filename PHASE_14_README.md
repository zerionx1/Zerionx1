# Zerion X1 Phase 14 — Real Broker Data + Execution Boundary

What this phase adds:
- Upstox real profile/funds/positions/holdings/orders/trades reads.
- Upstox live order confirmation through UpLink Business.
- cTrader Open API JSON/WebSocket account discovery and account-state reads.
- cTrader user-confirmed live order transport.
- Live Trading page separated from Paper Trading.
- Live P&L persistence model separated from paper P&L.
- Trade proposal persistence and explicit confirmation boundary.
- 4-colour premium UI extended with accessible motion.

Important production behavior:
- Upstox third-party/business order flow uses UpLink Business confirmation.
- cTrader Open API uses official JSON over WebSocket on port 5036.
- Crypto remains Coming Soon.
- Live orders do not execute directly from an AI suggestion; user confirmation is required.

Database:
Run `supabase/migrations/20260818_phase14_live_trading.sql` in Supabase before testing persisted trade proposals.

No credentials are included in this package.
Phase 13 `.env.local` credentials remain in use.
