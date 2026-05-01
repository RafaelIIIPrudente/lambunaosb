-- Migration: self-signup with pending approval (2026-05-01)
--
-- Auth model change: invite-only → public sign-up + Secretary approval.
-- Decision (Option A from RISEN prompt): add `pending` to the existing
-- `user_role` enum rather than introduce a new `profile_status` enum or
-- make role nullable. Trade-off: enum gets a non-real-role filler; payoff:
-- zero changes to RLS policies that currently gate on
-- `current_user_role() = 'secretary'` etc., minimal blast radius.
--
-- Approval gate at the app/middleware layer:
--   approved  ⇔  active = true  AND  role <> 'pending'
--   pending   ⇔  active = false AND  role  = 'pending'
--   deactivated ⇔ active = false AND  role <> 'pending'  (existing semantic)
--
-- ROLLBACK PLAN: postgres enums can't drop values without recreating the
-- type. To revert: (1) UPDATE profiles SET role = 'sb_member', active = false
-- WHERE role = 'pending'; (2) live with the orphan enum value, OR rebuild
-- the enum (CREATE TYPE user_role_new AS ENUM (...without pending);
-- ALTER TABLE profiles ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;
-- DROP TYPE user_role; ALTER TYPE user_role_new RENAME TO user_role).
-- Existing rows are unaffected — Bryan's secretary record retains role=secretary.

BEGIN;

-- Add 'pending' to the role enum.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pending';

COMMIT;

-- Note: cannot wrap ALTER TYPE ADD VALUE in the same transaction as queries
-- that USE the new value. The trigger that inserts profiles with role='pending'
-- is in a follow-up migration (0006) so the new enum value is committed first.
