-- Migration: extend user_role enum with two ex-officio SB roles
--
-- Rationale: SB Lambunao seats two ex-officio members alongside elected SB
-- members — the SKMF President (Sangguniang Kabataan Municipal Federation,
-- the youth-council president at municipal level) and the Liga President
-- (Liga ng mga Barangay, the federation of barangay captains). Both need
-- their own user_role for invite flows and audit-log attribution. Their
-- permission tier mirrors `sb_member` for now.
--
-- Idempotent via IF NOT EXISTS; each ALTER TYPE runs as its own top-level
-- statement (Postgres restriction — ALTER TYPE ADD VALUE cannot be wrapped
-- in BEGIN/COMMIT).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'skmf_president';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'liga_president';
