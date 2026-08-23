create table if not exists public.signal_outcomes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.agent_opportunities(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  entry_price numeric not null,
  stop_loss numeric not null,
  target_price numeric not null,
  confidence numeric not null,
  quality_score numeric not null,
  outcome text not null default 'open' check (outcome in ('open','win','loss','expired')),
  r_multiple numeric,
  last_price numeric,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.signal_outcomes enable row level security;
create index if not exists signal_outcomes_status_created
  on public.signal_outcomes(outcome, created_at desc);
create index if not exists signal_outcomes_resolved
  on public.signal_outcomes(resolved_at desc);
