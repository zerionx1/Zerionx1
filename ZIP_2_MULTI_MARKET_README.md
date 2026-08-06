# Zerion X1 ZIP 2 — Multi-Market Workspace

This patch adds a provider-aware market explorer, global symbol search, multiple persistent watchlists, add/remove instrument flows, and support for Indian equity, indices, futures, options, commodities, crypto, forex, US stocks and ETFs.

No synthetic quote values are introduced. Instruments without a configured provider show `Provider required`.

## Required migration
Run `supabase/migrations/20260806_zip2_multi_market_watchlists.sql` in Supabase SQL Editor.

## Validation
`npm run typecheck && npm test && npm run build`
