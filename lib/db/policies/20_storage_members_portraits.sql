-- Supabase Storage bucket + RLS for SB member portraits.
-- Path convention: <tenant_id>/<member_id>/<timestamp>_<filename>.{jpg|png|webp}
-- Each upload creates a new immutable file; the member row's
-- `photo_storage_path` points to the latest. Old files stay (audit trail).

insert into storage.buckets (id, name, public)
values ('members-portraits', 'members-portraits', false)
on conflict (id) do nothing;

-- Authenticated tenant peers can read every portrait in their tenant.
create policy "members_portraits_select_tenant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'members-portraits'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- AUTHOR_ROLES (secretary, vice_mayor) can upload portraits scoped to their tenant.
-- SB members can also upload — RLS lets them; the action layer enforces self-edit.
create policy "members_portraits_insert_authors" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'members-portraits'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  );

-- Append-only at the storage level — no UPDATE / DELETE policies.
-- The Secretary can purge via the dashboard if needed.

-- Bucket-level enforcement: pre-compressed WebP only, max 500 KB per variant.
-- Three variants are uploaded per portrait (_400/_800/_1600.webp).
-- See docs/storage-optimization.md.
update storage.buckets
  set file_size_limit = 512000, -- 500 KB
      allowed_mime_types = array['image/webp']
  where id = 'members-portraits';
