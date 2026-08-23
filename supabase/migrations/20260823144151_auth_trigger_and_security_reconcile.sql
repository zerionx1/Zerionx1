drop trigger if exists on_auth_user_created on auth.users;

revoke execute on function public.bootstrap_zerion_user()
from public, anon, authenticated;

revoke execute on function public.handle_new_user()
from public, anon, authenticated;

alter function public.prevent_sensitive_profile_change()
set search_path = public;
