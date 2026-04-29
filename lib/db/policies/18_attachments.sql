-- attachments: tenant-scoped admin only.

alter table public.attachments enable row level security;

create policy "attachments_select_authenticated" on public.attachments
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "attachments_insert_authenticated" on public.attachments
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and uploaded_by = auth.uid()
  );

create policy "attachments_delete_secretary" on public.attachments
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );

-- No update — attachments are immutable.
revoke update on public.attachments from authenticated, anon;
