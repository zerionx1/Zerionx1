-- ZERION X1 ZIP 2 MIGRATION
alter table public.watchlists
  add column if not exists description text not null default '',
  add column if not exists color text not null default 'champagne',
  add column if not exists sort_order integer not null default 0;

create index if not exists watchlists_owner_sort
on public.watchlists(owner_id, sort_order, created_at);

create unique index if not exists watchlists_owner_name_unique
on public.watchlists(owner_id, lower(name));

-- ZERION X1 ZIP 3 MIGRATION
-- ZIP 3 indexes for strategy marketplace, versioning and persisted backtest research.
create index if not exists strategies_owner_status_updated
on public.strategies(owner_id, status, updated_at desc);

create index if not exists strategy_versions_owner_strategy_version
on public.strategy_versions(owner_id, strategy_id, version desc);

create index if not exists backtests_owner_created
on public.backtests(owner_id, created_at desc);

-- ZERION X1 ZIP 4 MIGRATION
create table if not exists public.algo_deployments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, strategy_id uuid not null references public.strategies(id) on delete restrict,
  mode text not null check (mode in ('paper','live')), market text not null, symbol text not null,
  capital numeric not null check (capital>0), status text not null default 'paused' check (status in ('paused','active','stopped','error')),
  risk_config jsonb not null default '{}'::jsonb, broker_connection_id uuid references public.broker_connections(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.execution_approvals (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  deployment_id uuid not null references public.algo_deployments(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected','revoked')), confirmation jsonb not null default '{}'::jsonb,
  approved_at timestamptz, created_at timestamptz not null default now()
);
alter table public.algo_deployments enable row level security; alter table public.execution_approvals enable row level security;
drop policy if exists owner_all on public.algo_deployments; create policy owner_all on public.algo_deployments for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists owner_all on public.execution_approvals; create policy owner_all on public.execution_approvals for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create index if not exists algo_deployments_owner_created on public.algo_deployments(owner_id,created_at desc);
create index if not exists execution_approvals_owner_created on public.execution_approvals(owner_id,created_at desc);
