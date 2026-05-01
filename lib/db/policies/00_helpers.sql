-- Helper functions used by every policy. Run this BEFORE any per-table policy file.
-- Per PROJECT.md §6.

create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated, anon;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated, anon;
