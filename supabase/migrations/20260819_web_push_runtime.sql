create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, endpoint)
);
create index if not exists push_subscriptions_owner_enabled
  on public.push_subscriptions(owner_id, enabled);
alter table public.push_subscriptions enable row level security;
drop policy if exists owner_all_push_subscriptions on public.push_subscriptions;
create policy owner_all_push_subscriptions
  on public.push_subscriptions for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
