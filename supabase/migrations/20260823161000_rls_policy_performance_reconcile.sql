drop policy if exists owner_all on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles update own safe fields" on public.profiles;

create policy "profiles read own"
on public.profiles
for select
using (id = (select auth.uid()));

create policy "profiles update own safe fields"
on public.profiles
for update
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists owner_all on public.algo_deployments;
drop policy if exists algo_deployments_owner_select on public.algo_deployments;
drop policy if exists algo_deployments_owner_insert on public.algo_deployments;
drop policy if exists algo_deployments_owner_update on public.algo_deployments;
drop policy if exists algo_deployments_owner_delete on public.algo_deployments;

create policy algo_deployments_owner_select
on public.algo_deployments
for select
using (owner_id = (select auth.uid()));

create policy algo_deployments_owner_insert
on public.algo_deployments
for insert
with check (owner_id = (select auth.uid()));

create policy algo_deployments_owner_update
on public.algo_deployments
for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy algo_deployments_owner_delete
on public.algo_deployments
for delete
using (owner_id = (select auth.uid()));

drop policy if exists owner_all_push_subscriptions on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;

create policy push_subscriptions_owner_select
on public.push_subscriptions
for select
using (owner_id = (select auth.uid()));

create policy push_subscriptions_owner_insert
on public.push_subscriptions
for insert
with check (owner_id = (select auth.uid()));

create policy push_subscriptions_owner_update
on public.push_subscriptions
for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy push_subscriptions_owner_delete
on public.push_subscriptions
for delete
using (owner_id = (select auth.uid()));

drop policy if exists owner_all_user_notifications on public.user_notifications;
drop policy if exists user_notifications_owner_select on public.user_notifications;
drop policy if exists user_notifications_owner_insert on public.user_notifications;
drop policy if exists user_notifications_owner_update on public.user_notifications;
drop policy if exists user_notifications_owner_delete on public.user_notifications;

create policy user_notifications_owner_select
on public.user_notifications
for select
using (owner_id = (select auth.uid()));

create policy user_notifications_owner_insert
on public.user_notifications
for insert
with check (owner_id = (select auth.uid()));

create policy user_notifications_owner_update
on public.user_notifications
for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy user_notifications_owner_delete
on public.user_notifications
for delete
using (owner_id = (select auth.uid()));
