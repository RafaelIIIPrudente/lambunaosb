-- Migration: auth audit P0/P1 remediations (2026-05-01)
--
-- Three changes from the production-readiness audit:
--
-- 1) P0 — drop profiles_update_self
--    The policy let any authenticated user update their own row with no
--    column whitelist, allowing self-promotion via
--    `supabase.from('profiles').update({ role: 'secretary' }).eq('id', auth.uid())`
--    from the browser. Codebase has zero direct supabase.from('profiles')
--    writes — all profile mutations route through Drizzle/server actions
--    which bypass RLS as the privileged DB role. Dropping the policy closes
--    the escalation vector with no app-side fallout.
--
-- 2) P0 — enable RLS on meeting_minutes
--    Table had relrowsecurity = false and zero policies. Mirroring the
--    news_posts pattern: anon reads only `published` rows, authenticated
--    reads tenant-scoped, writes restricted to secretary/mayor/vice_mayor,
--    deletes secretary-only.
--
-- 3) Tighten anon SELECT on committees and committee_assignments
--    Previously USING (true) — wide-open to any tenant. Replaced with a
--    tenant-scoped lookup via tenants.slug = 'lambunao' so a future
--    multi-tenant flip doesn't leak committee data across tenants.
--    The policies/04_committees.sql and policies/05_committee_assignments.sql
--    files are NOT updated by this migration since they describe the
--    initial setup; this migration is the authoritative source going
--    forward. Update the policy files in a follow-up housekeeping commit.

BEGIN;

-- 1) Profiles: drop the loose self-update policy.
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- 2) Meeting minutes: enable RLS + add policies.
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_minutes_select_authenticated" ON public.meeting_minutes
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "meeting_minutes_select_public" ON public.meeting_minutes
  FOR SELECT TO anon
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "meeting_minutes_insert_staff" ON public.meeting_minutes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_user_role() IN ('secretary', 'mayor', 'vice_mayor')
  );

CREATE POLICY "meeting_minutes_update_staff" ON public.meeting_minutes
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_user_role() IN ('secretary', 'mayor', 'vice_mayor')
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "meeting_minutes_delete_secretary" ON public.meeting_minutes
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_user_role() = 'secretary'
  );

-- 3) Committees + committee_assignments: tighten anon SELECT to lambunao tenant only.
DROP POLICY IF EXISTS "committees_select_anon" ON public.committees;
CREATE POLICY "committees_select_anon" ON public.committees
  FOR SELECT TO anon
  USING (tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lambunao'));

DROP POLICY IF EXISTS "committee_assignments_select_anon" ON public.committee_assignments;
CREATE POLICY "committee_assignments_select_anon" ON public.committee_assignments
  FOR SELECT TO anon
  USING (tenant_id = (SELECT id FROM public.tenants WHERE slug = 'lambunao'));

COMMIT;
