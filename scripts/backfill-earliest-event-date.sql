-- Backfill Script: Generate earliest_event_date for all deals with event schedules
-- This script computes the earliest date from each deal's event schedule and updates
-- the earliest_event_date column. It handles both specific dates (startDate) and
-- flexible date ranges (rangeStartMonth/rangeStartYear).
--
-- Usage: Run this script against the database when:
--   1. After importing legacy data
--   2. To fix any deals that may have missing earliest_event_date values
--   3. As a data integrity check/repair
--
-- The script is idempotent - safe to run multiple times.

WITH earliest_dates AS (
  SELECT 
    d.id,
    MIN(
      CASE 
        -- For specific dates: startDate is already in YYYY-MM-DD format
        WHEN (schedule->>'startDate') IS NOT NULL THEN 
          (schedule->>'startDate')::date
        -- For range dates: use the 1st of the month
        WHEN (schedule->>'rangeStartYear') IS NOT NULL AND (schedule->>'rangeStartMonth') IS NOT NULL THEN
          make_date(
            (schedule->>'rangeStartYear')::int,
            (schedule->>'rangeStartMonth')::int,
            1
          )
        ELSE NULL
      END
    ) as earliest_date
  FROM deals d
  CROSS JOIN LATERAL jsonb_array_elements(d.event_schedule) AS event
  CROSS JOIN LATERAL jsonb_array_elements(event->'schedules') AS schedule
  WHERE d.event_schedule IS NOT NULL 
    AND d.event_schedule != '[]'::jsonb
    AND jsonb_array_length(d.event_schedule) > 0
  GROUP BY d.id
)
UPDATE deals
SET earliest_event_date = ed.earliest_date
FROM earliest_dates ed
WHERE deals.id = ed.id
  AND (deals.earliest_event_date IS DISTINCT FROM ed.earliest_date);

-- Report results
SELECT 
  COUNT(*) FILTER (WHERE earliest_event_date IS NOT NULL) as deals_with_dates,
  COUNT(*) FILTER (WHERE earliest_event_date IS NULL AND event_schedule IS NOT NULL AND event_schedule != '[]'::jsonb) as deals_missing_dates,
  COUNT(*) as total_deals
FROM deals;
