-- Migration: Replace hardcoded deal statuses with deal_statuses reference table
-- Run this BEFORE db:push to preserve existing data.
-- This migration is idempotent and safe to re-run.

BEGIN;

-- Step 1: Create deal_statuses reference table if it does not exist
CREATE TABLE IF NOT EXISTS deal_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color_light VARCHAR(100) NOT NULL DEFAULT '#888888',
  color_dark VARCHAR(100) NOT NULL DEFAULT '#aaaaaa',
  win_probability INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false
);

-- Step 2: Seed the 8 pipeline stages (skip if already seeded)
INSERT INTO deal_statuses (name, sort_order, color_light, color_dark, win_probability, is_active, is_default)
SELECT * FROM (VALUES
  ('Prospecting',     1, '#6366f1', '#818cf8', 10,  true,  false),
  ('Initial Contact', 2, '#0ea5e9', '#38bdf8', 20,  true,  true),
  ('Qualified Lead',  3, '#8b5cf6', '#a78bfa', 40,  true,  false),
  ('Negotiation',     4, '#f59e0b', '#fbbf24', 60,  true,  false),
  ('Closed Won',      5, '#10b981', '#34d399', 100, false, false),
  ('Closed Lost',     6, '#ef4444', '#f87171', 0,   false, false),
  ('Declined by Us',  7, '#64748b', '#94a3b8', 0,   false, false),
  ('Legacy',          8, '#9ca3af', '#d1d5db', 0,   false, false)
) AS v(name, sort_order, color_light, color_dark, win_probability, is_active, is_default)
WHERE NOT EXISTS (SELECT 1 FROM deal_statuses LIMIT 1);

-- Step 3: Add status_legacy column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'status_legacy'
  ) THEN
    ALTER TABLE deals ADD COLUMN status_legacy VARCHAR(100);
  END IF;
END $$;

-- Step 4: Preserve original text status values into status_legacy
-- This runs before the column type conversion, so status is still varchar
UPDATE deals
SET status_legacy = status::text
WHERE status_legacy IS NULL;

-- Step 5: Set all existing deals to Legacy status ID
-- After this, deals.status contains the Legacy status ID (integer as text)
UPDATE deals
SET status = (SELECT id::text FROM deal_statuses WHERE name = 'Legacy')
WHERE status NOT IN (SELECT id::text FROM deal_statuses);

-- Step 6: After running this migration, run db:push to convert
-- deals.status from varchar to integer FK and enforce the constraint.
-- The integer values set in step 5 will be safely cast by PostgreSQL.

COMMIT;
