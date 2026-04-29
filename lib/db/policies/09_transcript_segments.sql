-- transcript_segments: same access as the parent transcript.
-- Admin RU; secretary delete.

alter table public.transcript_segments enable row level security;

create policy "transcript_segments_select_public" on public.transcript_segments
  for select to anon
  using (
    exists (
      select 1
      from public.transcripts t
      join public.meetings m on m.id = t.meeting_id
      where t.id = transcript_segments.transcript_id
        and t.status = 'approved'
        and m.status = 'minutes_published'
    )
  );

create policy "transcript_segments_select_authenticated" on public.transcript_segments
  for select to authenticated
  using (
    exists (
      select 1 from public.transcripts t
      where t.id = transcript_segments.transcript_id
        and t.tenant_id = public.current_tenant_id()
    )
  );

create policy "transcript_segments_insert" on public.transcript_segments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.transcripts t
      where t.id = transcript_segments.transcript_id
        and t.tenant_id = public.current_tenant_id()
    )
    and public.current_user_role() in ('secretary', 'vice_mayor', 'sb_member')
  );

create policy "transcript_segments_update" on public.transcript_segments
  for update to authenticated
  using (
    exists (
      select 1 from public.transcripts t
      where t.id = transcript_segments.transcript_id
        and t.tenant_id = public.current_tenant_id()
    )
    and public.current_user_role() in ('secretary', 'vice_mayor', 'sb_member')
  );

create policy "transcript_segments_delete_secretary" on public.transcript_segments
  for delete to authenticated
  using (
    public.current_user_role() = 'secretary'
    and exists (
      select 1 from public.transcripts t
      where t.id = transcript_segments.transcript_id
        and t.tenant_id = public.current_tenant_id()
    )
  );
