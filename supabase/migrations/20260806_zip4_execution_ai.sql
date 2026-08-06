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
