-- Idempotent data backfills retained from the former migration history.
-- Run after `prisma db push` when upgrading a database that already contains
-- meetings, commitments, or stages. It is safe on an empty database.

BEGIN;

UPDATE "MeetingParticipant"
SET
  "participantType" = 'USER',
  "origin" = 'UNIT_MEMBER'
WHERE "participantType" IS NULL OR "origin" IS NULL;

UPDATE "Commitment"
SET
  "proposedById" = COALESCE("proposedById", "createdById"),
  "confirmedById" = COALESCE("confirmedById", "createdById"),
  "confirmedAt" = COALESCE("confirmedAt", "createdAt")
WHERE "confirmationStatus" = 'CONFIRMED'
  AND (
    "proposedById" IS NULL OR
    "confirmedById" IS NULL OR
    "confirmedAt" IS NULL
  );

INSERT INTO "CommitmentContext" (
  "id",
  "commitmentId",
  "targetType",
  "unitId",
  "projectId",
  "includeChildren",
  "isPrimary",
  "createdAt"
)
SELECT
  CONCAT('ctx-', commitment."id"),
  commitment."id",
  CASE
    WHEN commitment."projectId" IS NULL
      THEN 'ORG_UNIT'::"CommitmentTargetType"
    ELSE 'PROJECT'::"CommitmentTargetType"
  END,
  commitment."unitId",
  commitment."projectId",
  false,
  true,
  CURRENT_TIMESTAMP
FROM "Commitment" commitment
WHERE NOT EXISTS (
  SELECT 1
  FROM "CommitmentContext" context
  WHERE context."commitmentId" = commitment."id"
)
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_stage_version_backfill" ON COMMIT DROP AS
SELECT
  stage."id" AS "stageId",
  stage."projectId" AS "projectId",
  stage."name" AS "baseName",
  'stage-version-group-' || stage."id"::text AS "groupId",
  'stage-version-' || stage."id"::text AS "versionId",
  CASE
    WHEN lower(stage."name") LIKE '%basico%'
      OR lower(stage."name") LIKE '%basicos%'
      OR lower(stage."name") LIKE '%básico%'
      OR lower(stage."name") LIKE '%básicos%'
      THEN 'BASICOS'::"StageVersionType"
    WHEN lower(stage."name") LIKE '%especial%'
      THEN 'ESPECIALIDADES'::"StageVersionType"
    WHEN lower(stage."name") LIKE '%costo%'
      OR lower(stage."name") LIKE '%presupuesto%'
      THEN 'COSTOS'::"StageVersionType"
    ELSE 'OTRO'::"StageVersionType"
  END AS "stageType"
FROM "Stages" stage
WHERE NOT EXISTS (
  SELECT 1
  FROM "StageVersion" version
  WHERE version."stageId" = stage."id"
);

INSERT INTO "StageVersionGroup" (
  "id",
  "projectId",
  "baseName",
  "stageType",
  "createdAt",
  "updatedAt"
)
SELECT
  "groupId",
  "projectId",
  "baseName",
  "stageType",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_stage_version_backfill"
ON CONFLICT DO NOTHING;

INSERT INTO "StageVersion" (
  "id",
  "groupId",
  "stageId",
  "versionNumber",
  "versionLabel",
  "sourceKind",
  "sourceProjectId",
  "sourceStageId",
  "status",
  "isCurrent",
  "createdAt",
  "updatedAt"
)
SELECT
  "versionId",
  "groupId",
  "stageId",
  1,
  'v1',
  'EMPTY',
  NULL,
  NULL,
  'ACTIVE',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_stage_version_backfill"
ON CONFLICT DO NOTHING;

COMMIT;
