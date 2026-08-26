DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionBonusOrigin') THEN
    CREATE TYPE "ProductionBonusOrigin" AS ENUM ('ASSIGNED_BY_MANAGER', 'REQUESTED_BY_USER', 'REGISTERED_BY_ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionBonusStatus') THEN
    CREATE TYPE "ProductionBonusStatus" AS ENUM ('BORRADOR', 'ASIGNADO', 'EN_CURSO', 'PROCESO', 'APROBADO', 'RECHAZADO', 'OBSERVADO', 'PENDIENTE_VALIDACION', 'VALIDADO', 'ANULADO', 'LIQUIDADO', 'CERRADO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionBonusType') THEN
    CREATE TYPE "ProductionBonusType" AS ENUM ('HORAS_EXTRA', 'DOMINGO', 'FERIADO', 'MADRUGADA', 'CORRIDO', 'EMERGENCIA', 'OTRO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionBonusEvidenceType') THEN
    CREATE TYPE "ProductionBonusEvidenceType" AS ENUM ('PHOTO', 'DOCUMENT', 'WHATSAPP_SCREENSHOT', 'ATTENDANCE_REFERENCE', 'GATE_CONTROL_REFERENCE', 'NOTE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductionBonusEventType') THEN
    CREATE TYPE "ProductionBonusEventType" AS ENUM ('ASSIGNMENT_CREATED', 'ASSIGNMENT_UPDATED', 'ASSIGNMENT_RESCHEDULED', 'ASSIGNMENT_CANCELLED', 'REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_OBSERVED', 'EVIDENCE_ATTACHED', 'HOURS_VALIDATED', 'REQUEST_LIQUIDATED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProductionBonusRequest" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "origin" "ProductionBonusOrigin" NOT NULL DEFAULT 'ASSIGNED_BY_MANAGER',
  "assignedById" INTEGER,
  "requestedById" INTEGER,
  "supervisorId" INTEGER,
  "validatedById" INTEGER,
  "liquidatedById" INTEGER,
  "type" "ProductionBonusType" NOT NULL,
  "status" "ProductionBonusStatus" NOT NULL DEFAULT 'ASIGNADO',
  "reason" TEXT NOT NULL,
  "feedback" TEXT,
  "validationFeedback" TEXT,
  "workDate" TIMESTAMP(3) NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "assignedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "requestedHours" DOUBLE PRECISION,
  "approvedHours" DOUBLE PRECISION,
  "executedHours" DOUBLE PRECISION,
  "validatedHours" DOUBLE PRECISION,
  "amount" DOUBLE PRECISION,
  "evidenceFile" TEXT,
  "assignedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  "liquidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionBonusRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductionBonusEvidence" (
  "id" TEXT NOT NULL,
  "productionBonusRequestId" TEXT NOT NULL,
  "type" "ProductionBonusEvidenceType" NOT NULL DEFAULT 'NOTE',
  "filePath" TEXT,
  "originalName" TEXT,
  "mimeType" TEXT,
  "note" TEXT,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionBonusEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductionBonusEvent" (
  "id" TEXT NOT NULL,
  "productionBonusRequestId" TEXT NOT NULL,
  "actorId" INTEGER,
  "eventType" "ProductionBonusEventType" NOT NULL,
  "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "metadata" JSONB,
  CONSTRAINT "ProductionBonusEvent_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusRequest_userId_fkey') THEN
    ALTER TABLE "ProductionBonusRequest" ADD CONSTRAINT "ProductionBonusRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusRequest_assignedById_fkey') THEN
    ALTER TABLE "ProductionBonusRequest" ADD CONSTRAINT "ProductionBonusRequest_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusRequest_requestedById_fkey') THEN
    ALTER TABLE "ProductionBonusRequest" ADD CONSTRAINT "ProductionBonusRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusRequest_supervisorId_fkey') THEN
    ALTER TABLE "ProductionBonusRequest" ADD CONSTRAINT "ProductionBonusRequest_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusRequest_validatedById_fkey') THEN
    ALTER TABLE "ProductionBonusRequest" ADD CONSTRAINT "ProductionBonusRequest_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusRequest_liquidatedById_fkey') THEN
    ALTER TABLE "ProductionBonusRequest" ADD CONSTRAINT "ProductionBonusRequest_liquidatedById_fkey" FOREIGN KEY ("liquidatedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusEvidence_productionBonusRequestId_fkey') THEN
    ALTER TABLE "ProductionBonusEvidence" ADD CONSTRAINT "ProductionBonusEvidence_productionBonusRequestId_fkey" FOREIGN KEY ("productionBonusRequestId") REFERENCES "ProductionBonusRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusEvidence_createdById_fkey') THEN
    ALTER TABLE "ProductionBonusEvidence" ADD CONSTRAINT "ProductionBonusEvidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusEvent_productionBonusRequestId_fkey') THEN
    ALTER TABLE "ProductionBonusEvent" ADD CONSTRAINT "ProductionBonusEvent_productionBonusRequestId_fkey" FOREIGN KEY ("productionBonusRequestId") REFERENCES "ProductionBonusRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionBonusEvent_actorId_fkey') THEN
    ALTER TABLE "ProductionBonusEvent" ADD CONSTRAINT "ProductionBonusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductionBonusRequest_userId_startDate_idx" ON "ProductionBonusRequest"("userId", "startDate");
CREATE INDEX IF NOT EXISTS "ProductionBonusRequest_status_idx" ON "ProductionBonusRequest"("status");
CREATE INDEX IF NOT EXISTS "ProductionBonusRequest_origin_idx" ON "ProductionBonusRequest"("origin");
CREATE INDEX IF NOT EXISTS "ProductionBonusRequest_type_idx" ON "ProductionBonusRequest"("type");
CREATE INDEX IF NOT EXISTS "ProductionBonusRequest_assignedById_idx" ON "ProductionBonusRequest"("assignedById");
CREATE INDEX IF NOT EXISTS "ProductionBonusRequest_startDate_endDate_idx" ON "ProductionBonusRequest"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvidence_productionBonusRequestId_idx" ON "ProductionBonusEvidence"("productionBonusRequestId");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvidence_createdById_idx" ON "ProductionBonusEvidence"("createdById");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvidence_type_idx" ON "ProductionBonusEvidence"("type");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvent_productionBonusRequestId_idx" ON "ProductionBonusEvent"("productionBonusRequestId");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvent_actorId_idx" ON "ProductionBonusEvent"("actorId");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvent_eventType_idx" ON "ProductionBonusEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ProductionBonusEvent_eventAt_idx" ON "ProductionBonusEvent"("eventAt");
