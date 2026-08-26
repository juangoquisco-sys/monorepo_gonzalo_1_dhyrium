-- Database constraints that Prisma schema.prisma cannot currently express.
-- Run after `prisma db push` in every environment. The statements are idempotent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrganizationalUnit_not_self_parent_check'
      AND conrelid = '"OrganizationalUnit"'::regclass
  ) THEN
    ALTER TABLE "OrganizationalUnit"
      ADD CONSTRAINT "OrganizationalUnit_not_self_parent_check"
      CHECK ("parentId" IS NULL OR "parentId" <> "id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrganizationalMembership_date_order_check'
      AND conrelid = '"OrganizationalMembership"'::regclass
  ) THEN
    ALTER TABLE "OrganizationalMembership"
      ADD CONSTRAINT "OrganizationalMembership_date_order_check"
      CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MeetingParticipant_one_subject_check'
      AND conrelid = '"MeetingParticipant"'::regclass
  ) THEN
    ALTER TABLE "MeetingParticipant"
      ADD CONSTRAINT "MeetingParticipant_one_subject_check"
      CHECK (
        (CASE WHEN "userId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "externalContactId" IS NULL THEN 0 ELSE 1 END) = 1
      );
  END IF;
END $$;

-- Prisma cannot represent this partial unique index. It guarantees one active
-- formal unit lead for memberships without an end date.
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationalMembership_active_unit_lead_key"
  ON "OrganizationalMembership"("unitId")
  WHERE "isUnitLead" = true AND "endDate" IS NULL;

-- Every attendance list must be finalized or discarded before another manual
-- or biometric list can start. A constant expression makes the pending set
-- globally unique while preserving unlimited finalized history.
DROP INDEX IF EXISTS "List_one_open_biometric_key";
CREATE UNIQUE INDEX IF NOT EXISTS "List_one_pending_attendance_key"
  ON "List" ((1))
  WHERE "state" IN ('OPEN', 'REVIEW');

COMMIT;
