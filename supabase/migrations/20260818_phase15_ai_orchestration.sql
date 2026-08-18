-- Zerion X1 Phase 15 — AI orchestration persistence

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Zerion conversation',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.algo_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  deployment_id uuid references public.algo_deployments(id) on delete cascade,
  symbol text not null,
  timeframe text not null,
  source text not null,
  assessment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;
alter table public.algo_observations enable row level security;

drop policy if exists owner_all on public.ai_threads;
create policy owner_all on public.ai_threads
for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

drop policy if exists owner_all on public.ai_messages;
create policy owner_all on public.ai_messages
for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

drop policy if exists owner_all on public.algo_observations;
create policy owner_all on public.algo_observations
for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create index if not exists ai_threads_owner_updated
on public.ai_threads(owner_id,updated_at desc);

create index if not exists ai_messages_owner_thread_created
on public.ai_messages(owner_id,thread_id,created_at);

create index if not exists algo_observations_owner_created
on public.algo_observations(owner_id,created_at desc);
