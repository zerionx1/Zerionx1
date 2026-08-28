begin;

create table if not exists public.agent_developing_setups(
  symbol text primary key,
  market text not null,
  price numeric not null,
  confidence numeric not null,
  quality_score numeric not null,
  reason text,
  source text,
  analysis jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists agent_developing_setups_expiry_idx on public.agent_developing_setups(expires_at desc,quality_score desc);
alter table public.agent_developing_setups enable row level security;
drop policy if exists agent_developing_authenticated_read on public.agent_developing_setups;
create policy agent_developing_authenticated_read on public.agent_developing_setups for select to authenticated using(true);

create table if not exists public.broker_lifecycle_state(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  broker_key text not null,
  external_key text not null,
  symbol text,
  last_status text not null,
  payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(owner_id,broker_key,external_key)
);
create index if not exists broker_lifecycle_owner_idx on public.broker_lifecycle_state(owner_id,broker_key,last_seen_at desc);
alter table public.broker_lifecycle_state enable row level security;
drop policy if exists broker_lifecycle_owner_select on public.broker_lifecycle_state;
create policy broker_lifecycle_owner_select on public.broker_lifecycle_state for select using(owner_id=auth.uid());
drop policy if exists broker_lifecycle_owner_insert on public.broker_lifecycle_state;
create policy broker_lifecycle_owner_insert on public.broker_lifecycle_state for insert with check(owner_id=auth.uid());
drop policy if exists broker_lifecycle_owner_update on public.broker_lifecycle_state;
create policy broker_lifecycle_owner_update on public.broker_lifecycle_state for update using(owner_id=auth.uid()) with check(owner_id=auth.uid());

commit;
