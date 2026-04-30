-- Supabase Storage bucket + RLS for news cover images.
-- Path convention: <tenant_id>/<news_post_id>/<timestamp>_<filename>.{jpg|png|webp}
-- Each upload creates a new immutable file; the post row's
-- `cover_storage_path` points to the latest. Old files stay (audit trail).

insert into storage.buckets (id, name, public)
values ('news-covers', 'news-covers', false)
on conflict (id) do nothing;

-- Authenticated tenant peers can read every cover in their tenant.
create policy "news_covers_select_tenant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'news-covers'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- AUTHOR_ROLES (secretary, mayor, vice_mayor, sb_member) can upload covers
-- scoped to their tenant.
create policy "news_covers_insert_authors" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'news-covers'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  );

-- Append-only at the storage level — no UPDATE / DELETE policies.

-- Bucket-level enforcement: pre-compressed WebP only, max 500 KB per variant.
-- Three variants are uploaded per cover (_400/_800/_1600.webp).
-- See docs/storage-optimization.md.
update storage.buckets
  set file_size_limit = 512000, -- 500 KB
      allowed_mime_types = array['image/webp']
  where id = 'news-covers';
