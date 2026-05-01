-- Supabase Storage bucket + RLS for meeting audio (raw recordings).
-- Path conventions:
--   live chunks:   <tenant_id>/<meeting_id>/<chunk_index>.<ext>
--   uploaded file: <tenant_id>/<meeting_id>/upload_<timestamp>.<ext>
--
-- Audio is sensitive (citizen voices, sometimes identifying info) and is
-- never publicly readable. The transcription worker downloads via the
-- service-role key (bypasses RLS). All other access is signed URL only,
-- generated server-side via createAdminClient().

insert into storage.buckets (id, name, public)
values ('meeting-audio', 'meeting-audio', false)
on conflict (id) do nothing;

-- INSERT: secretary, mayor, vice_mayor only — within their tenant prefix.
create policy "meeting_audio_insert_recorder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meeting-audio'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  );

-- SELECT: deliberately none for authenticated. Reads happen via signed URLs
--   issued server-side by the transcription pipeline (service-role key).
--   No anon, no public.

-- Bucket-level enforcement: 200 MB hard cap per file (single uploaded
-- recording or single 5-minute live chunk), audio mime types only.
update storage.buckets
  set file_size_limit = 209715200, -- 200 MB
      allowed_mime_types = array[
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/x-m4a',
        'audio/ogg'
      ]
  where id = 'meeting-audio';
