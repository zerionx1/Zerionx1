alter table public.audit_events enable row level security;
alter table public.platform_settings enable row level security;
alter table public.signal_outcomes enable row level security;

drop policy if exists deny_client_access on public.audit_events;
create policy deny_client_access on public.audit_events
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_client_access on public.platform_settings;
create policy deny_client_access on public.platform_settings
for all to anon, authenticated
using (false)
with check (false);

drop policy if exists deny_client_access on public.signal_outcomes;
create policy deny_client_access on public.signal_outcomes
for all to anon, authenticated
using (false)
with check (false);
