ALTER TABLE "DutyRotation"
ADD COLUMN IF NOT EXISTS "capabilityKey" TEXT;

ALTER TABLE "DutyRotation"
ADD COLUMN IF NOT EXISTS "accessWindowDays" INTEGER NOT NULL DEFAULT 14;

CREATE INDEX IF NOT EXISTS "DutyRotation_capabilityKey_idx"
ON "DutyRotation"("capabilityKey");
