-- Migration: meeting_minutes table + news_posts.meeting_id backlink
--
-- Rationale: SB minutes are structured documents (cover · roll call · items
-- of business with motions/seconds/dispositions · adjournment · signatures)
-- following Local Government Code §§52-54 / DILG SB minutes format. They
-- need a state machine separate from raw transcripts: secretary drafts →
-- presiding officer attests → secretary publishes.
--
-- Architecture (C-simplified):
--   meeting_minutes is the canonical structured source.
--   On publish, server action serialises items_of_business → markdown,
--   creates a news_posts row, links via meeting_minutes.published_news_post_id.
--   The news post is the public-facing artifact; meeting_minutes drives
--   the editor and the print-friendly view.
--
-- Schema deltas:
--   1. New enum meeting_minutes_status.
--   2. New table meeting_minutes (1:1 with meetings via UNIQUE meeting_id).
--   3. news_posts.meeting_id nullable FK (set null on meeting delete).
--   4. transcripts.metadata jsonb for cost telemetry (asr / cleanup costs,
--      model versions, transcribed_at).
--   5. meetings.cleanup_enabled boolean (per-meeting Hiligaynon cleanup toggle).
--
-- Backfill: all new columns are nullable or have defaults. No data migration.

BEGIN;

-- 1. New enum for minutes state machine.
CREATE TYPE meeting_minutes_status AS ENUM (
  'draft',
  'awaiting_attestation',
  'attested',
  'published',
  'archived'
);

-- 2. meeting_minutes table.
CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL UNIQUE REFERENCES public.meetings(id) ON DELETE CASCADE,
  status meeting_minutes_status NOT NULL DEFAULT 'draft',
  cover_header text NOT NULL DEFAULT '',
  attendees_text text NOT NULL DEFAULT '',
  items_of_business jsonb NOT NULL DEFAULT '[]'::jsonb,
  adjournment_summary text NOT NULL DEFAULT '',
  drafted_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  drafted_at timestamptz,
  ready_for_attestation_at timestamptz,
  attested_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  attested_at timestamptz,
  published_news_post_id uuid REFERENCES public.news_posts(id) ON DELETE SET NULL,
  published_at timestamptz,
  generation_cost_usd numeric(10, 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX meeting_minutes_tenant_status_idx
  ON public.meeting_minutes(tenant_id, status)
  WHERE deleted_at IS NULL;

-- 3. news_posts backlink. Nullable. SET NULL on meeting delete to keep the
--    public news post intact even if the source meeting is purged.
ALTER TABLE public.news_posts
  ADD COLUMN meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;

-- 4. transcripts.metadata jsonb for cost telemetry.
ALTER TABLE public.transcripts
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. meetings.cleanup_enabled — per-meeting Hiligaynon cleanup toggle.
ALTER TABLE public.meetings
  ADD COLUMN cleanup_enabled boolean NOT NULL DEFAULT false;

COMMIT;
