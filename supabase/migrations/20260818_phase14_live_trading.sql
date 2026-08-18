-- Zerion X1 Phase 14 — live trading persistence

create table if not exists public.trade_proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  broker_key text not null,
  strategy_id text,
  mode text not null check (mode in ('paper','live')),
  status text not null default 'draft',
  symbol text,
  order_payload jsonb not null default '{}'::jsonb,
  rationale jsonb not null default '[]'::jsonb,
  confidence numeric,
  execution_result jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  broker_key text not null,
  external_account_id text,
  currency text,
  balance numeric,
  equity numeric,
  unrealized_pnl numeric,
  realized_pnl numeric,
  positions jsonb not null default '[]'::jsonb,
  orders jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now()
);

alter table public.trade_proposals enable row level security;
alter table public.live_account_snapshots enable row level security;

drop policy if exists owner_all on public.trade_proposals;
create policy owner_all on public.trade_proposals
for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

drop policy if exists owner_all on public.live_account_snapshots;
create policy owner_all on public.live_account_snapshots
for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create index if not exists trade_proposals_owner_status_created
on public.trade_proposals(owner_id,status,created_at desc);

create index if not exists live_account_snapshots_owner_broker_captured
on public.live_account_snapshots(owner_id,broker_key,captured_at desc);
