# Phase 19
Broker credential diagnostics + Indian F&O UX correction.

Adds:
- server-side credential status route
- broker UI that distinguishes deployed-server credentials from missing credentials
- clear message when credentials exist only in Termux .env.local
- F&O command center with NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY and stock derivative categories
- F&O instruments in paper ticket
- paper/live wording cleaned up

Important: exact option expiries/strikes/instrument keys cannot be safely hardcoded. They must be resolved from Upstox after account authorization. The UI therefore exposes the complete derivative categories while preserving provider-backed contract resolution.
