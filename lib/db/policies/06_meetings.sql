-- meetings: public read of minutes_published only. Admin CRUD by role.

alter table public.meetings enable row level security;

create policy "meetings_select_public_minutes" on public.meetings
  for select to anon
  using (status = 'minutes_published' and deleted_at is null);

create policy "meetings_select_authenticated" on public.meetings
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "meetings_insert" on public.meetings
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  );

create policy "meetings_update" on public.meetings
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  )
  with check (tenant_id = public.current_tenant_id());

create policy "meetings_delete_secretary" on public.meetings
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
