# Zerion X1 Phase 11 — Premium UI/UX + Account Flow

This patch focuses on the part that must feel obvious to a new user.

## What changes
- Four-colour palette is mixed instead of painting every surface the same colour.
- Workspace panels use depth, borders, contrast, responsive spacing and premium motion.
- Mobile layout is tightened for small screens and horizontal tables remain usable.
- Account screen becomes a command center with readiness progress and a clear 01→04 journey.
- Logout remains real Supabase logout.
- Account deletion no longer uses a fake alert; it opens a verified support request route.
- Existing profile API remains the source of truth.
- No generated fake trading data is added by this patch.

## Apply
Unzip this archive directly inside the Zerion X1 repo, then:

```bash
chmod +x APPLY_PHASE_11.sh
./APPLY_PHASE_11.sh
```

The script runs typecheck, tests and production build before declaring success.
