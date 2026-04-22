-- Drop fields on proposals that duplicate values from the linked deal.
-- These should always be read directly from the deal instead.

ALTER TABLE proposals DROP COLUMN IF EXISTS budget_low;
ALTER TABLE proposals DROP COLUMN IF EXISTS budget_high;
ALTER TABLE proposals DROP COLUMN IF EXISTS budget_notes;
ALTER TABLE proposals DROP COLUMN IF EXISTS locations;
ALTER TABLE proposals DROP COLUMN IF EXISTS event_schedule;
ALTER TABLE proposals DROP COLUMN IF EXISTS service_ids;
