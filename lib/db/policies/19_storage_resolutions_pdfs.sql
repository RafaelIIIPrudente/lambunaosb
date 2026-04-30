-- Supabase Storage bucket + RLS for resolution PDFs.
-- Path convention: <tenant_id>/<resolution_id>/<timestamp>_<filename>.pdf
-- Each upload creates a new immutable file; the resolution row's
-- `pdf_storage_path` points to the latest. Old files stay for the audit trail.

insert into storage.buckets (id, name, public)
values ('resolutions-pdfs', 'resolutions-pdfs', false)
on conflict (id) do nothing;

-- Authenticated tenant peers can read every PDF in their tenant.
create policy "resolutions_pdfs_select_tenant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resolutions-pdfs'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- AUTHOR_ROLES can upload new PDFs scoped to their tenant.
create policy "resolutions_pdfs_insert_authors" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resolutions-pdfs'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_user_role() in (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

-- Append-only at the storage level too — no UPDATE / DELETE policies.
-- The Secretary can purge via the dashboard if absolutely necessary.

-- Bucket-level enforcement: PDFs only, max 10 MB after client-side
-- pdf-lib lossless re-save. See docs/storage-optimization.md.
update storage.buckets
  set file_size_limit = 10485760, -- 10 MB
      allowed_mime_types = array['application/pdf']
  where id = 'resolutions-pdfs';
