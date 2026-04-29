-- deletion_requests: created by service role on behalf of the citizen.
-- Token confirmation flows through a route handler that uses the service role.
-- No direct anon or authenticated access.

alter table public.deletion_requests enable row level security;

create policy "deletion_requests_select_secretary" on public.deletion_requests
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );

revoke insert, update, delete on public.deletion_requests from authenticated, anon;
