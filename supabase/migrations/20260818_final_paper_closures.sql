create table if not exists public.paper_trade_closures(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  position_id uuid not null,
  symbol text not null,
  market text not null,
  quantity numeric not null,
  average_price numeric not null,
  exit_price numeric not null,
  realized_pnl numeric not null default 0,
  closed_at timestamptz not null default now()
);
alter table public.paper_trade_closures enable row level security;
drop policy if exists paper_trade_closures_owner_all on public.paper_trade_closures;
create policy paper_trade_closures_owner_all on public.paper_trade_closures
for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create index if not exists paper_trade_closures_owner_closed on public.paper_trade_closures(owner_id,closed_at desc);
