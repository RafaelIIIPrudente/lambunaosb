-- Migration: add `committee_id` foreign key to news_posts
--
-- Rationale: news posts can now be attributed to a referring committee
-- (the canonical 22 from project_committees.md). This is distinct from
-- the existing `category` enum which classifies content type
-- (notice / hearing / event / announcement / press_release).
--
-- ON DELETE SET NULL mirrors the existing resolutions.committee_id rule —
-- soft-removing a committee leaves historical news posts intact with a
-- null attribution rather than cascading.
--
-- Backfill: column is nullable; all existing rows get NULL by default.
-- No data migration needed.

BEGIN;

ALTER TABLE news_posts
  ADD COLUMN committee_id uuid REFERENCES committees(id) ON DELETE SET NULL;

COMMIT;
