# Phase 3 APIs

- `GET/POST /api/strategies`
- `GET /api/strategies/:strategyId`
- `POST /api/strategies/:strategyId/validate`
- `GET/POST /api/strategies/:strategyId/versions`
- `GET/POST /api/backtests`
- `GET /api/backtests/:backtestId`
- `POST /api/risk/position-size`
- `GET/POST /api/risk/kill-switch`

All routes use typed API envelopes. Production authentication, persistence and distributed workers are completed in later phases.
