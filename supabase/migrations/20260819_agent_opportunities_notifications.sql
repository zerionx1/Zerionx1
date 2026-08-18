create table if not exists public.agent_opportunities (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  symbol text not null,
  market text not null,
  price numeric not null,
  direction text not null check (direction in ('long-watch','short-watch','neutral')),
  confidence integer not null check (confidence between 0 and 100),
  reason text not null,
  source text not null,
  mode text not null check (mode in ('powerx-assisted','deterministic-fallback')),
  analysis jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','dismissed','expired')),
  requires_user_approval boolean not null default true,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.agent_opportunities(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists user_notifications_owner_opportunity_unique
  on public.user_notifications(owner_id, opportunity_id)
  where opportunity_id is not null;

create index if not exists agent_opportunities_status_expiry
  on public.agent_opportunities(status, expires_at desc);

create index if not exists user_notifications_owner_created
  on public.user_notifications(owner_id, created_at desc);

alter table public.agent_opportunities enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists authenticated_read_agent_opportunities on public.agent_opportunities;
create policy authenticated_read_agent_opportunities
  on public.agent_opportunities
  for select
  to authenticated
  using (true);

drop policy if exists owner_all_user_notifications on public.user_notifications;
create policy owner_all_user_notifications
  on public.user_notifications
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
