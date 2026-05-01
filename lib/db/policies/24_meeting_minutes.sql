-- meeting_minutes: tenant peers read all; public reads only published rows.
-- Secretary + Mayor + Vice Mayor draft and update; secretary deletes.

alter table public.meeting_minutes enable row level security;

create policy "meeting_minutes_select_authenticated" on public.meeting_minutes
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- Public reads only published, non-deleted minutes (mirrors news_posts).
create policy "meeting_minutes_select_public" on public.meeting_minutes
  for select to anon
  using (status = 'published' and deleted_at is null);

create policy "meeting_minutes_insert_staff" on public.meeting_minutes
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  );

create policy "meeting_minutes_update_staff" on public.meeting_minutes
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  )
  with check (tenant_id = public.current_tenant_id());

create policy "meeting_minutes_delete_secretary" on public.meeting_minutes
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
