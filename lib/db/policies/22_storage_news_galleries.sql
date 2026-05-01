-- Supabase Storage bucket + RLS for news photo galleries.
-- Path convention: <tenant_id>/<news_post_id>/<timestamp>_<filename>.{jpg|png|webp}
-- Max 15 photos per post enforced at the action layer.

insert into storage.buckets (id, name, public)
values ('news-galleries', 'news-galleries', false)
on conflict (id) do nothing;

create policy "news_galleries_select_tenant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'news-galleries'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

create policy "news_galleries_insert_authors" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'news-galleries'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_user_role() in (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

-- Bucket-level enforcement: pre-compressed WebP only, max 500 KB per variant.
-- Three variants are uploaded per gallery photo (_400/_800/_1600.webp).
-- See docs/storage-optimization.md.
update storage.buckets
  set file_size_limit = 512000, -- 500 KB
      allowed_mime_types = array['image/webp']
  where id = 'news-galleries';
