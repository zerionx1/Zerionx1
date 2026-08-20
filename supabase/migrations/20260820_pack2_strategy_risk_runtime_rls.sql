-- Zerion X1 Pack 2 — RLS-safe strategy runtime + risk controls.

-- Fix exact strategy-install failure:
drop policy if exists subscription_owner_insert on public.subscriptions;
create policy subscription_owner_insert
on public.subscriptions
for insert
with check (owner_id = auth.uid());

-- Deployment ownership must remain authenticated-user scoped.
alter table if exists public.algo_deployments enable row level security;

drop policy if exists algo_deployments_owner_select on public.algo_deployments;
create policy algo_deployments_owner_select
on public.algo_deployments for select
using (owner_id = auth.uid());

drop policy if exists algo_deployments_owner_insert on public.algo_deployments;
create policy algo_deployments_owner_insert
on public.algo_deployments for insert
with check (owner_id = auth.uid());

drop policy if exists algo_deployments_owner_update on public.algo_deployments;
create policy algo_deployments_owner_update
on public.algo_deployments for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists algo_deployments_owner_delete on public.algo_deployments;
create policy algo_deployments_owner_delete
on public.algo_deployments for delete
using (owner_id = auth.uid());

alter table if exists public.algo_deployments
  add column if not exists last_evaluation_at timestamptz,
  add column if not exists last_signal text,
  add column if not exists last_action text,
  add column if not exists runtime_health text not null default 'idle',
  add column if not exists runtime_error text,
  add column if not exists last_price numeric,
  add column if not exists evaluation_count bigint not null default 0;

create table if not exists public.trading_risk_controls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('paper','live')),
  daily_profit_target numeric,
  daily_max_loss numeric,
  max_loss_per_trade numeric,
  risk_per_trade_pct numeric not null default 1 check (risk_per_trade_pct > 0 and risk_per_trade_pct <= 100),
  max_open_positions integer not null default 3 check (max_open_positions > 0),
  max_total_exposure numeric,
  max_trades_per_day integer not null default 20 check (max_trades_per_day > 0),
  stop_after_daily_loss boolean not null default true,
  stop_after_daily_target boolean not null default false,
  default_stop_loss_pct numeric check (default_stop_loss_pct is null or default_stop_loss_pct > 0),
  default_take_profit_pct numeric check (default_take_profit_pct is null or default_take_profit_pct > 0),
  min_risk_reward numeric not null default 1.5 check (min_risk_reward > 0),
  trailing_stop_enabled boolean not null default false,
  trailing_stop_pct numeric check (trailing_stop_pct is null or trailing_stop_pct > 0),
  auto_paper_execution boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, mode)
);

alter table public.trading_risk_controls enable row level security;
drop policy if exists risk_controls_owner_all on public.trading_risk_controls;
create policy risk_controls_owner_all
on public.trading_risk_controls
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create index if not exists risk_controls_owner_mode
  on public.trading_risk_controls(owner_id, mode);
