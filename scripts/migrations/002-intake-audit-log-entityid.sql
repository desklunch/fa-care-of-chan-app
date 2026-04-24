-- Backfill audit_logs rows for intake create/update/delete events so that
-- entity_id holds the dealId (not the intakeId), matching deal:intake_synced
-- and the deal-history query (which filters by entity_type='deal' AND
-- entity_id=dealId).
--
-- For each affected row:
--   - move the deal id (currently in changes.dealId) into entity_id
--   - move the original intake id (currently in entity_id) into changes.intakeId
--   - drop changes.dealId
--
-- Idempotent: rows that no longer have changes.dealId are skipped, so this
-- script is safe to re-run.

DO $$
DECLARE
  updated_count integer;
  skipped_count integer;
BEGIN
  SELECT count(*) INTO skipped_count
  FROM audit_logs
  WHERE entity_type = 'deal'
    AND metadata->>'eventType' IN (
      'deal:intake_created',
      'deal:intake_updated',
      'deal:intake_deleted'
    )
    AND NOT (changes ? 'dealId')
    AND NOT (changes ? 'intakeId');

  WITH updated AS (
    UPDATE audit_logs
    SET
      changes = CASE
        WHEN changes ? 'intakeId' THEN changes - 'dealId'
        ELSE jsonb_set(changes - 'dealId', '{intakeId}', to_jsonb(entity_id))
      END,
      entity_id = changes->>'dealId'
    WHERE entity_type = 'deal'
      AND metadata->>'eventType' IN (
        'deal:intake_created',
        'deal:intake_updated',
        'deal:intake_deleted'
      )
      AND changes ? 'dealId'
    RETURNING 1
  )
  SELECT count(*) INTO updated_count FROM updated;

  RAISE NOTICE 'intake-audit-log-entityid backfill: updated=% skipped_no_dealid=%',
    updated_count, skipped_count;
END $$;
