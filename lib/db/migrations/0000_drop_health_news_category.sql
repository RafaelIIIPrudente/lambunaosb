-- Migration: drop `health` from news_category enum
--
-- Rationale: news_category mixed content-types (notice, hearing, event,
-- announcement, press_release) with a single topic-shaped value (health).
-- Topic categorisation now belongs to the committee roster (see
-- project_committees.md), so `health` is removed from this enum. Existing
-- health-categorised rows are reclassified to `announcement` since that is
-- the most semantically neutral existing value.

BEGIN;

-- Step 1: backfill existing rows so no row carries the value about to disappear
UPDATE news_posts SET category = 'announcement' WHERE category = 'health';

-- Step 2: swap the enum type
--   Postgres does not allow dropping a value from an enum directly. Standard
--   pattern is rename old → create new → cast column → drop old.
ALTER TYPE news_category RENAME TO news_category_old;

CREATE TYPE news_category AS ENUM (
  'notice',
  'hearing',
  'event',
  'announcement',
  'press_release'
);

ALTER TABLE news_posts
  ALTER COLUMN category TYPE news_category
  USING category::text::news_category;

DROP TYPE news_category_old;

COMMIT;
