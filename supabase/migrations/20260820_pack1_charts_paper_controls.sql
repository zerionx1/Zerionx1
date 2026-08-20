-- Zerion X1 Pack 1: chart drawings + paper SL/target persistence.
-- Safe/RLS-owned additions only.

alter table if exists public.paper_positions
  add column if not exists stop_loss numeric,
  add column if not exists target_price numeric;

create table if not exists public.chart_drawings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  instrument_id text not null,
  timeframe text not null,
  drawings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, instrument_id, timeframe)
);

alter table public.chart_drawings enable row level security;

drop policy if exists owner_all on public.chart_drawings;
create policy owner_all on public.chart_drawings
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create index if not exists chart_drawings_owner_instrument_tf
  on public.chart_drawings(owner_id, instrument_id, timeframe);
