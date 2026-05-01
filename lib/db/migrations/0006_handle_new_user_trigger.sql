-- Migration: handle_new_user trigger (2026-05-01)
--
-- Pairs with 0005_self_signup_pending_approval.sql. When a row is inserted
-- into auth.users (via supabase.auth.signUp()), a corresponding row in
-- public.profiles is created in pending state — role='pending', active=false.
-- The Secretary later approves via /admin/users which flips both columns.
--
-- Decision (auto-mode): trigger fires on INSERT, not on
-- email_confirmed_at transition. Rationale: project's SMTP config still
-- uses Supabase default (rate-limited, often spam-classified), so making
-- the profile creation depend on email verification would block legit
-- sign-ups. The pending state itself is the security gate — pending users
-- can't access /admin regardless of email-confirmed status. Tighten this
-- after Resend SMTP is wired (see prior auth audit P1 #3).
--
-- The function is SECURITY DEFINER so it can write to public.profiles
-- regardless of the calling role; search_path is locked to public to
-- prevent any search-path attack vector.
--
-- ROLLBACK: DROP TRIGGER on_auth_user_created ON auth.users;
--           DROP FUNCTION public.handle_new_user();

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  resolved_tenant_id uuid;
  resolved_full_name text;
BEGIN
  -- Single-tenant for now. When multi-tenant flips, source tenant_id from
  -- a JWT claim or signup metadata instead of the hardcoded slug lookup.
  SELECT id INTO resolved_tenant_id FROM public.tenants WHERE slug = 'lambunao';

  -- full_name comes from supabase.auth.signUp({ options: { data: { full_name } } }).
  -- Fall back to the email's local-part if the signup form somehow omitted it.
  resolved_full_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, tenant_id, role, email, full_name, active, invited_at)
  VALUES (
    NEW.id,
    resolved_tenant_id,
    'pending'::public.user_role,
    NEW.email,
    resolved_full_name,
    false,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;
