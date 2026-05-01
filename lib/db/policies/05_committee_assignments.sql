-- committee_assignments: public read (committee composition is transparent).
-- Secretary + Vice Mayor manage.

alter table public.committee_assignments enable row level security;

-- Anon SELECT is tenant-scoped (not USING true) so the multi-tenant flip
-- doesn't leak assignment data across tenants.
create policy "committee_assignments_select_anon" on public.committee_assignments
  for select to anon
  using (tenant_id = (select id from public.tenants where slug = 'lambunao'));

create policy "committee_assignments_select_authenticated" on public.committee_assignments
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "committee_assignments_insert" on public.committee_assignments
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  );

create policy "committee_assignments_update" on public.committee_assignments
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  )
  with check (tenant_id = public.current_tenant_id());

create policy "committee_assignments_delete" on public.committee_assignments
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  );
