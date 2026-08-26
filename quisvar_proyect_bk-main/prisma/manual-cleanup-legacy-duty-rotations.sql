-- One-time cleanup for databases restored with the legacy duty-rotation schema.
--
-- This script intentionally removes only legacy duty-rotation data. It aborts
-- before changing anything unless the legacy assignment columns are present and
-- no current assignment columns exist, so it cannot erase upgraded or hybrid data.
-- Take and verify an external database backup before executing it.

BEGIN;

DO $legacy_rotation_cleanup$
BEGIN
  IF to_regclass('public."DutyRotation"') IS NULL
    OR to_regclass('public."DutyRotationAssignment"') IS NULL
    OR to_regclass('public."DutyRotationGenerationBatch"') IS NULL
    OR to_regclass('public."DutySwapRequest"') IS NULL THEN
    RAISE EXCEPTION
      'Legacy duty-rotation tables are incomplete; cleanup was not executed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DutyRotationAssignment'
      AND column_name = 'date'
  )
    OR NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'DutyRotationAssignment'
        AND column_name = 'timeSlot'
  ) THEN
    RAISE EXCEPTION
      'Current duty-rotation schema detected; cleanup was not executed.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DutyRotationAssignment'
      AND column_name IN (
        'occurrenceKey',
        'periodStart',
        'periodEnd',
        'dueOn',
        'slotKey'
      )
  ) THEN
    RAISE EXCEPTION
      'Current or hybrid duty-rotation schema detected; cleanup was not executed.';
  END IF;
END
$legacy_rotation_cleanup$;

DELETE FROM "DutySwapRequest";
DELETE FROM "DutyRotationAssignment";
DELETE FROM "DutyRotationGenerationBatch";
DELETE FROM "DutyRotation";

COMMIT;
