-- Migration: Add `kind` discriminator to deal_intakes so a deal can have both
-- an Intake (kind='intake') and a Deal Discovery (kind='discovery').
--
-- Safe to run multiple times.

BEGIN;

-- 1) Add the kind column with a default so existing rows backfill to 'intake'.
ALTER TABLE deal_intakes
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'intake';

-- 2) Drop the old single-column unique constraint on deal_id (auto-named).
--    Drizzle's `.unique()` produces a constraint named `<table>_<col>_unique`.
ALTER TABLE deal_intakes
  DROP CONSTRAINT IF EXISTS deal_intakes_deal_id_unique;
ALTER TABLE deal_intakes
  DROP CONSTRAINT IF EXISTS deal_intakes_deal_id_key;

-- 3) Add the new compound unique constraint on (deal_id, kind).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_deal_intakes_deal_kind'
  ) THEN
    ALTER TABLE deal_intakes
      ADD CONSTRAINT uniq_deal_intakes_deal_kind UNIQUE (deal_id, kind);
  END IF;
END $$;

-- 4) Add the kind index.
CREATE INDEX IF NOT EXISTS idx_deal_intakes_kind ON deal_intakes (kind);

COMMIT;
