# Zerion X1 Phase 13 — Production Trading Foundation

This phase starts the new production-first rebuild.

Included:
- 4-colour premium workspace override (less maroon-heavy)
- cleaner mobile broker workflow
- Upstox + cTrader only as active account connectors
- Crypto shown as Coming Soon
- Upstox referral Create Account flow
- cTrader Create Account intentionally disabled until a partner/referral URL exists
- provider-specific OAuth URLs
- OAuth state/cookie protection
- real Upstox authorization-code token exchange
- real cTrader authorization-code token exchange
- AES-256-GCM encrypted broker token storage in `broker_connections.metadata`
- 10 simple India/Forex strategy templates
- working `Install & Deploy` and `Customize` actions

Credentials are NOT included in this ZIP.
Add them through Termux after applying the phase.

Required environment variables:
- UPSTOX_CLIENT_ID
- UPSTOX_CLIENT_SECRET
- UPSTOX_REDIRECT_URI
- CTRADER_CLIENT_ID
- CTRADER_CLIENT_SECRET
- CTRADER_REDIRECT_URI
- BROKER_TOKEN_ENCRYPTION_KEY
- NEXT_PUBLIC_APP_URL

Production redirect URIs used by this phase:
- https://zerionx1.vercel.app/api/brokers/upstox/callback
- https://zerionx1.vercel.app/api/brokers/ctrader/callback

Important:
- The same redirect URI must exist in the corresponding provider developer app.
- Never commit `.env.local`.
- Phase 14 will add provider account sync, token lifecycle, live positions/P&L and trading adapters.
