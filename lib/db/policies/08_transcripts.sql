-- transcripts: public can read approved transcripts whose meeting is published.
-- Admin can RU; Secretary + Vice Mayor approve.

alter table public.transcripts enable row level security;

create policy "transcripts_select_public" on public.transcripts
  for select to anon
  using (
    status = 'approved'
    and exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id and m.status = 'minutes_published'
    )
  );

create policy "transcripts_select_authenticated" on public.transcripts
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "transcripts_insert" on public.transcripts
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  );

create policy "transcripts_update" on public.transcripts
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'vice_mayor')
  )
  with check (tenant_id = public.current_tenant_id());

create policy "transcripts_delete_secretary" on public.transcripts
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
