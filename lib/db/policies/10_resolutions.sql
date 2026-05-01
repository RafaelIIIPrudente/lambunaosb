-- resolutions: public read of published. Authors create; Secretary + Mayor publish.

alter table public.resolutions enable row level security;

create policy "resolutions_select_public" on public.resolutions
  for select to anon
  using (status = 'published' and deleted_at is null);

create policy "resolutions_select_authenticated" on public.resolutions
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "resolutions_insert" on public.resolutions
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  );

create policy "resolutions_update" on public.resolutions
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
      or (public.current_user_role() = 'sb_member' and primary_sponsor_id = (
        select member_id from public.profiles where id = auth.uid()
      ))
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    -- Publish-gate: only Secretary or Mayor can flip status to 'published'
    and (status <> 'published' or public.current_user_role() in ('secretary', 'mayor'))
  );

create policy "resolutions_delete_secretary" on public.resolutions
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
