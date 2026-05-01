-- Migration: extend INSERT-policy role lists for the two new ex-officio
-- user_role values (skmf_president, liga_president).
--
-- Rationale: Migration 0001 added these enum values, and the application
-- layer was broadened to grant them sb_member-tier permissions. Without
-- this migration the RLS policies still gate uploads/replies on the old
-- 4-role list, so SKMF/Liga users would 42501 (insufficient privilege) at
-- the DB layer despite passing the app-layer checks.
--
-- Each policy is dropped and recreated with the extended IN list. Wrapped
-- in a transaction so a partial failure leaves the DB in its prior state.

BEGIN;

-- 1. citizen_query_replies — admin-tier reply authoring
DROP POLICY IF EXISTS "citizen_query_replies_insert_admin" ON public.citizen_query_replies;
CREATE POLICY "citizen_query_replies_insert_admin" ON public.citizen_query_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND author_id = auth.uid()
    AND public.current_user_role() IN (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

-- 2. resolutions-pdfs storage bucket — author uploads
DROP POLICY IF EXISTS "resolutions_pdfs_insert_authors" ON storage.objects;
CREATE POLICY "resolutions_pdfs_insert_authors" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resolutions-pdfs'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_user_role() IN (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

-- 3. news-covers storage bucket — author uploads
DROP POLICY IF EXISTS "news_covers_insert_authors" ON storage.objects;
CREATE POLICY "news_covers_insert_authors" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'news-covers'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_user_role() IN (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

-- 4. news-galleries storage bucket — author uploads
DROP POLICY IF EXISTS "news_galleries_insert_authors" ON storage.objects;
CREATE POLICY "news_galleries_insert_authors" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'news-galleries'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND public.current_user_role() IN (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

COMMIT;
