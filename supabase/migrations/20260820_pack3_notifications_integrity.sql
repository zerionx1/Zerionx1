-- Zerion X1 Pack 3 — notification integrity + RLS hardening.

alter table if exists public.user_notifications
  add column if not exists event_key text,
  add column if not exists event_data jsonb not null default '{}'::jsonb,
  add column if not exists action_url text,
  add column if not exists delivered_push_at timestamptz;

create unique index if not exists user_notifications_owner_event_key
  on public.user_notifications(owner_id, event_key)
  where event_key is not null;

create index if not exists user_notifications_owner_created
  on public.user_notifications(owner_id, created_at desc);

alter table if exists public.user_notifications enable row level security;

drop policy if exists user_notifications_owner_select on public.user_notifications;
create policy user_notifications_owner_select
on public.user_notifications for select
using (owner_id = auth.uid());

drop policy if exists user_notifications_owner_insert on public.user_notifications;
create policy user_notifications_owner_insert
on public.user_notifications for insert
with check (owner_id = auth.uid());

drop policy if exists user_notifications_owner_update on public.user_notifications;
create policy user_notifications_owner_update
on public.user_notifications for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

alter table if exists public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
create policy push_subscriptions_owner_select
on public.push_subscriptions for select
using (owner_id = auth.uid());

drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
create policy push_subscriptions_owner_insert
on public.push_subscriptions for insert
with check (owner_id = auth.uid());

drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
create policy push_subscriptions_owner_update
on public.push_subscriptions for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_delete
on public.push_subscriptions for delete
using (owner_id = auth.uid());
