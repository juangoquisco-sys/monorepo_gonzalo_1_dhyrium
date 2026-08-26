-- Extensión no destructiva del rediseño de Rotaciones.
-- Revisar backup y ejecutar mediante el procedimiento autorizado del entorno.
-- Este archivo NO fue ejecutado automáticamente.

DO $$
BEGIN
  ALTER TYPE "DutyRotationAssignmentStrategy"
    ADD VALUE IF NOT EXISTS 'DISTRIBUTE_PARTICIPANTS';
EXCEPTION
  WHEN undefined_object THEN
    RAISE EXCEPTION 'No existe el esquema rediseñado de Rotaciones';
END $$;

DO $$
BEGIN
  CREATE TYPE "DutyRotationParticipantSource" AS ENUM (
    'EXPLICIT',
    'ACTIVE_ELIGIBLE_SYNC'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DutyRotationEvidencePolicy" AS ENUM (
    'NONE',
    'OPTIONAL_PHOTO',
    'REQUIRED_PHOTO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "DutyRotation"
  ADD COLUMN IF NOT EXISTS "participantSource"
    "DutyRotationParticipantSource" NOT NULL DEFAULT 'EXPLICIT',
  ADD COLUMN IF NOT EXISTS "evidencePolicy"
    "DutyRotationEvidencePolicy" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "rosterVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "DutyRotationAssignment"
  ADD COLUMN IF NOT EXISTS "baseSlotKey" TEXT,
  ADD COLUMN IF NOT EXISTS "slotPosition" INTEGER,
  ADD COLUMN IF NOT EXISTS "slotInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "participantUniquenessScope" TEXT,
  ADD COLUMN IF NOT EXISTS "rosterVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "evidencePolicy"
    "DutyRotationEvidencePolicy" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "completionRequestKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS
  "DutyRotationAssignment_completionRequestKey_key"
  ON "DutyRotationAssignment"("completionRequestKey");

CREATE UNIQUE INDEX IF NOT EXISTS
  "DutyRotationAssignment_dutyId_occurrenceKey_assignedUserId_participantUniquenessScope_key"
  ON "DutyRotationAssignment"(
    "dutyId",
    "occurrenceKey",
    "assignedUserId",
    "participantUniquenessScope"
  );

CREATE TABLE IF NOT EXISTS "DutyRotationOccurrenceExclusion" (
  "id" TEXT NOT NULL,
  "dutyId" TEXT NOT NULL,
  "occurrenceKey" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "reason" TEXT,
  "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DutyRotationOccurrenceExclusion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DutyRotationOccurrenceExclusion_dutyId_fkey"
    FOREIGN KEY ("dutyId") REFERENCES "DutyRotation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DutyRotationOccurrenceExclusion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "Users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DutyRotationOccurrenceExclusion_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "Users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
  "DutyRotationOccurrenceExclusion_dutyId_occurrenceKey_userId_key"
  ON "DutyRotationOccurrenceExclusion"("dutyId", "occurrenceKey", "userId");
CREATE INDEX IF NOT EXISTS
  "DutyRotationOccurrenceExclusion_dutyId_occurrenceKey_idx"
  ON "DutyRotationOccurrenceExclusion"("dutyId", "occurrenceKey");
CREATE INDEX IF NOT EXISTS
  "DutyRotationOccurrenceExclusion_userId_idx"
  ON "DutyRotationOccurrenceExclusion"("userId");

CREATE TABLE IF NOT EXISTS "DutyRotationAssignmentEvidence" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "submittedById" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DutyRotationAssignmentEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DutyRotationAssignmentEvidence_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "DutyRotationAssignment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DutyRotationAssignmentEvidence_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "Users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
  "DutyRotationAssignmentEvidence_storageKey_key"
  ON "DutyRotationAssignmentEvidence"("storageKey");
CREATE INDEX IF NOT EXISTS
  "DutyRotationAssignmentEvidence_assignmentId_idx"
  ON "DutyRotationAssignmentEvidence"("assignmentId");
CREATE INDEX IF NOT EXISTS
  "DutyRotationAssignmentEvidence_submittedById_idx"
  ON "DutyRotationAssignmentEvidence"("submittedById");
