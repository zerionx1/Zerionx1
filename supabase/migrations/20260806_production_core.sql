-- Zerion X1 production persistence. Run in Supabase SQL editor once.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  timezone text not null default 'Asia/Kolkata',
  base_currency text not null default 'INR',
  risk_profile text not null default 'balanced' check (risk_profile in ('conservative','balanced','aggressive')),
  onboarding_completed boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, kind)
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, is_default boolean not null default false, items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists watchlists_one_default on public.watchlists(owner_id) where is_default;

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null, operator text not null, threshold numeric not null, status text not null default 'active',
  channels jsonb not null default '["in-app"]'::jsonb, triggered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, status text not null default 'draft', version integer not null default 1,
  definition jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.strategy_versions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid not null references public.strategies(id) on delete cascade, version integer not null,
  definition jsonb not null, note text not null default '', checksum text not null,
  created_at timestamptz not null default now(), unique(strategy_id, version)
);

create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  strategy_id text not null, status text not null, result jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.paper_accounts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'Primary Paper Account', currency text not null default 'INR',
  starting_balance numeric not null default 1000000, cash_balance numeric not null default 1000000,
  equity numeric not null default 1000000, buying_power numeric not null default 1000000,
  daily_pnl numeric not null default 0, total_pnl numeric not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reset_at timestamptz
);
create table if not exists public.paper_orders (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.paper_accounts(id) on delete cascade,
  client_order_id text not null, status text not null, order_data jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, client_order_id)
);
create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.paper_accounts(id) on delete cascade,
  symbol text not null, market text not null, quantity numeric not null, average_price numeric not null,
  mark_price numeric not null, unrealized_pnl numeric not null default 0, realized_pnl numeric not null default 0,
  opened_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(account_id, symbol, market)
);

create table if not exists public.broker_connections (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  broker_key text not null, display_name text not null, status text not null default 'disconnected',
  external_account_id text, scopes jsonb not null default '[]'::jsonb, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, broker_key)
);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null, captured_at timestamptz not null default now()
);
create index if not exists portfolio_owner_captured on public.portfolio_snapshots(owner_id, captured_at desc);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, entity_type text, entity_id text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_owner_created on public.activity_events(owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_documents enable row level security;
alter table public.watchlists enable row level security;
alter table public.price_alerts enable row level security;
alter table public.strategies enable row level security;
alter table public.strategy_versions enable row level security;
alter table public.backtests enable row level security;
alter table public.paper_accounts enable row level security;
alter table public.paper_orders enable row level security;
alter table public.paper_positions enable row level security;
alter table public.broker_connections enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.activity_events enable row level security;

do $$ declare t text; begin
  foreach t in array array['profiles','user_documents','watchlists','price_alerts','strategies','strategy_versions','backtests','paper_accounts','paper_orders','paper_positions','broker_connections','portfolio_snapshots','activity_events'] loop
    execute format('drop policy if exists owner_all on public.%I', t);
    if t = 'profiles' then
      execute 'create policy owner_all on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid())';
    else
      execute format('create policy owner_all on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
    end if;
  end loop;
end $$;

create or replace function public.bootstrap_zerion_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(user_id, full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing;
  insert into public.paper_accounts(owner_id) values(new.id) on conflict do nothing;
  insert into public.watchlists(owner_id,name,is_default) values(new.id,'Primary Watchlist',true) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_zerion on auth.users;
create trigger on_auth_user_created_zerion after insert on auth.users for each row execute function public.bootstrap_zerion_user();

-- Functional rebuild additions
create table if not exists public.trade_journal (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  quantity numeric not null check (quantity > 0),
  entry_price numeric not null check (entry_price >= 0),
  exit_price numeric,
  pnl numeric,
  notes text not null default '',
  tags jsonb not null default '[]'::jsonb,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.trade_journal enable row level security;
drop policy if exists owner_all on public.trade_journal;
create policy owner_all on public.trade_journal for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create index if not exists trade_journal_owner_opened on public.trade_journal(owner_id,opened_at desc);
