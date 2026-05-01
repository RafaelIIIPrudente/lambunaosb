-- committees: public read. Secretary + Vice Mayor manage.

alter table public.committees enable row level security;

-- Anon SELECT is tenant-scoped (not USING true) so the multi-tenant flip
-- doesn't leak committee data across tenants.
create policy "committees_select_anon" on public.committees
  for select to anon
  using (tenant_id = (select id from public.tenants where slug = 'lambunao'));

create policy "committees_select_authenticated" on public.committees
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "committees_insert" on public.committees
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  );

create policy "committees_update" on public.committees
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  )
  with check (tenant_id = public.current_tenant_id());

create policy "committees_delete_secretary" on public.committees
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
