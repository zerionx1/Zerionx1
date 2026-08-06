# Zerion X1 Functional Rebuild

This source package replaces the most visible placeholder flows with authenticated, persisted workflows.

## Included repairs

- Profile API uses the existing `profiles.id` schema.
- Strategy creation starts from valid, editable Momentum or RSI templates.
- Strategy editor supports name, symbols, timeframe, risk, graph nodes, save, validate and versions.
- Paper orders request the selected symbol's live quote and persist fills/positions/accounts.
- Crypto paper quotes use the public provider; Indian/forex require `ZERION_MARKET_DATA_BASE_URL`.
- Dashboard is based on the authenticated paper account, positions, strategies, alerts and watchlist.
- Risk OS calculates metrics from persisted paper positions instead of hard-coded values.
- Broker catalog uses named providers (Zerodha, Upstox, Angel One, Fyers, Shoonya, Binance, Bybit and OANDA).
- Journal CRUD is persisted in Supabase.
- Learning Center contains workflow-linked lessons and local progress.
- Market Explorer shows explicit market/provider readiness instead of sample labels.

## Required additional migration

After the existing production migration, run:

`supabase/migrations/20260806_functional_rebuild.sql`

## External credentials

Code cannot create broker approvals or licensed exchange feeds. Provider credentials must be configured in Vercel. When missing, the product reports that the provider is required and does not fabricate prices or a connected state.

## Validation

Run:

```bash
npm install
npm run typecheck
npm test
npm run build
```
