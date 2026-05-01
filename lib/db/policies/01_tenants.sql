-- tenants: members of a tenant can read their own tenant row.
-- Anyone (anon) can read because the public site needs the tenant's name and address.
-- Only the Secretary can update.

alter table public.tenants enable row level security;

create policy "tenants_select_anon" on public.tenants
  for select to anon
  using (true);

create policy "tenants_select_authenticated" on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

create policy "tenants_update_secretary" on public.tenants
  for update to authenticated
  using (id = public.current_tenant_id() and public.current_user_role() = 'secretary')
  with check (id = public.current_tenant_id());

-- Inserts/deletes confined to service-role (multi-tenant onboarding).
revoke insert, delete on public.tenants from authenticated, anon;
