-- sb_members: public can read active members showing on public directory.
-- Authenticated tenant peers can read all rows (including inactive).
-- Secretary + Vice Mayor can CRUD; SB members can update self.

alter table public.sb_members enable row level security;

create policy "sb_members_select_public" on public.sb_members
  for select to anon
  using (active = true and show_on_public = true and deleted_at is null);

create policy "sb_members_select_authenticated" on public.sb_members
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "sb_members_insert" on public.sb_members
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  );

create policy "sb_members_update" on public.sb_members
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary', 'vice_mayor')
      or id = (select member_id from public.profiles where id = auth.uid())
    )
  )
  with check (tenant_id = public.current_tenant_id());

create policy "sb_members_delete_secretary" on public.sb_members
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
