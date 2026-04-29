-- audio_chunks: tenant-scoped admin only. No public, no anon.

alter table public.audio_chunks enable row level security;

create policy "audio_chunks_select_admin" on public.audio_chunks
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "audio_chunks_insert_recorder" on public.audio_chunks
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  );

-- Audio chunks are immutable once uploaded.
revoke update, delete on public.audio_chunks from authenticated, anon;
