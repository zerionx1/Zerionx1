# Zerion X1 Phase 14 + 15 Master Package

Apply in this order:

1. `./APPLY_PHASE_14.sh`
2. Run `supabase/migrations/20260818_phase14_live_trading.sql` in Supabase.
3. `./APPLY_PHASE_15.sh`
4. Run `supabase/migrations/20260818_phase15_ai_orchestration.sql` in Supabase.

Phase 14:
- Upstox live account reads
- Upstox UpLink Business user-confirmation flow
- cTrader Open API live/demo account discovery and account state
- user-confirmed cTrader order transport
- separate Live Trading workspace and live persistence

Phase 15:
- Zerion AI workspace
- PowerX connector boundary
- deterministic fallback rules engine
- AI tool registry
- strategy/research/risk/action orchestration foundation
- AI chat persistence
- UI/UX Pro Max-informed luxury UX layer

Crypto remains Coming Soon.

No provider secrets are included.
Existing Phase 13 credentials remain in `.env.local`.
