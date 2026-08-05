# Phase 2 API Surface

- `GET /api/markets/quotes`
- `GET /api/markets/:instrumentId/candles`
- `GET /api/signals`
- `GET /api/signals/:signalId`
- `GET /api/paper/account`
- `GET /api/paper/positions`
- `GET|POST /api/paper/orders`
- `GET /api/watchlists`
- `GET /api/alerts`

All routes use the Phase 1 response envelope and keep live execution disabled.
