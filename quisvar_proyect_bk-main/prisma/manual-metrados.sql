-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoProjectStatus" AS ENUM ('DRAFT', 'IMPORTED', 'IN_PROGRESS', 'REVIEWED', 'APPROVED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoCalculationType" AS ENUM ('GENERAL', 'ACERO', 'PLATAFORMADO', 'MANUAL', 'MIXTO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoLineType" AS ENUM ('DETAIL', 'NOTE', 'GROUP', 'EMPTY', 'SUBTOTAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoLineStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'OBSERVED', 'VALIDATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoFileStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoIssueStatus" AS ENUM ('PENDING', 'FIXABLE', 'RESOLVED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
DO $$ BEGIN
  CREATE TYPE "MetradoEventType" AS ENUM (
    'PROJECT_CREATED',
    'PROJECT_UPDATED',
    'EXCEL_IMPORTED',
    'ITEM_CREATED',
    'ITEM_UPDATED',
    'ITEM_DELETED',
    'ITEM_MOVED',
    'LINE_CREATED',
    'LINE_UPDATED',
    'LINE_DELETED',
    'BLOCK_UPDATED',
    'VALIDATION_CREATED',
    'VALIDATION_RESOLVED',
    'EXCEL_EXPORTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- statement
CREATE TABLE IF NOT EXISTS "MetradoProject" (
  "id" TEXT NOT NULL,
  "projectId" INTEGER,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL DEFAULT '',
  "uniqueCode" TEXT,
  "localCode" TEXT,
  "modularCode" TEXT,
  "executingUnit" TEXT NOT NULL DEFAULT '',
  "educationalInstitution" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "status" "MetradoProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "decimalPrecision" INTEGER NOT NULL DEFAULT 2,
  "sourceWorkbookName" TEXT,
  "excelMetadata" JSONB,
  "createdById" INTEGER NOT NULL,
  "updatedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoProject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetradoProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MetradoProject_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoBlock" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "generalSheetName" TEXT,
  "rebarSheetName" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "MetradoBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoBlock_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoItem" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "parentId" TEXT,
  "itemCode" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT,
  "level" INTEGER NOT NULL,
  "calculationType" "MetradoCalculationType" NOT NULL DEFAULT 'GENERAL',
  "isHeading" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "styleType" TEXT,
  "metadata" JSONB,
  CONSTRAINT "MetradoItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoItem_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MetradoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoMeasurementLine" (
  "id" TEXT NOT NULL,
  "metradoItemId" TEXT NOT NULL,
  "metradoBlockId" TEXT NOT NULL,
  "lineType" "MetradoLineType" NOT NULL DEFAULT 'DETAIL',
  "description" TEXT NOT NULL,
  "times" DECIMAL(18,6),
  "unitCount" DECIMAL(18,6),
  "length" DECIMAL(18,6),
  "width" DECIMAL(18,6),
  "height" DECIMAL(18,6),
  "area" DECIMAL(18,6),
  "partial" DECIMAL(18,6),
  "total" DECIMAL(18,6),
  "formulas" JSONB,
  "validationStatus" "MetradoLineStatus" NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "styleType" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoMeasurementLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoMeasurementLine_metradoItemId_fkey" FOREIGN KEY ("metradoItemId") REFERENCES "MetradoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoMeasurementLine_metradoBlockId_fkey" FOREIGN KEY ("metradoBlockId") REFERENCES "MetradoBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoRebarLine" (
  "id" TEXT NOT NULL,
  "metradoItemId" TEXT NOT NULL,
  "metradoBlockId" TEXT NOT NULL,
  "lineType" "MetradoLineType" NOT NULL DEFAULT 'DETAIL',
  "description" TEXT NOT NULL,
  "design" TEXT,
  "diameter" TEXT,
  "sameElements" DECIMAL(18,6),
  "piecesPerElement" DECIMAL(18,6),
  "pieceLength" DECIMAL(18,6),
  "lengthTotal" DECIMAL(18,6),
  "weightPerMeter" DECIMAL(18,6),
  "weightKg" DECIMAL(18,6),
  "formulas" JSONB,
  "validationStatus" "MetradoLineStatus" NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "styleType" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoRebarLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoRebarLine_metradoItemId_fkey" FOREIGN KEY ("metradoItemId") REFERENCES "MetradoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoRebarLine_metradoBlockId_fkey" FOREIGN KEY ("metradoBlockId") REFERENCES "MetradoBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoPlatformadoLine" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "lineType" "MetradoLineType" NOT NULL DEFAULT 'DETAIL',
  "alignment" TEXT,
  "progressive" TEXT NOT NULL,
  "cutArea" DECIMAL(18,6),
  "fillArea" DECIMAL(18,6),
  "distance" DECIMAL(18,6),
  "cutVolume" DECIMAL(18,6),
  "fillVolume" DECIMAL(18,6),
  "cutAccumulated" DECIMAL(18,6),
  "fillAccumulated" DECIMAL(18,6),
  "total" DECIMAL(18,6),
  "formulas" JSONB,
  "validationStatus" "MetradoLineStatus" NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "styleType" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoPlatformadoLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoPlatformadoLine_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoImport" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "filePath" TEXT,
  "size" INTEGER,
  "mimeType" TEXT,
  "status" "MetradoFileStatus" NOT NULL DEFAULT 'PROCESSED',
  "summary" JSONB,
  "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoImport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoImport_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoExport" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "filePath" TEXT,
  "size" INTEGER,
  "mimeType" TEXT,
  "status" "MetradoFileStatus" NOT NULL DEFAULT 'PROCESSED',
  "summary" JSONB,
  "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoExport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoExport_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoExport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoValidationIssue" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "cellReference" TEXT,
  "issueType" TEXT NOT NULL,
  "originalFormula" TEXT,
  "suggestedFix" TEXT,
  "status" "MetradoIssueStatus" NOT NULL DEFAULT 'PENDING',
  "affectedCells" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoValidationIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoValidationIssue_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoEvent" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "actorId" INTEGER,
  "eventType" "MetradoEventType" NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "notes" TEXT,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoEvent_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- statement
CREATE TABLE IF NOT EXISTS "MetradoAttachment" (
  "id" TEXT NOT NULL,
  "metradoProjectId" TEXT NOT NULL,
  "metradoBlockId" TEXT,
  "metradoItemId" TEXT,
  "metradoMeasurementLineId" TEXT,
  "metradoRebarLineId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'image',
  "scope" TEXT NOT NULL DEFAULT 'measurement',
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "extension" TEXT NOT NULL,
  "dataUrl" TEXT NOT NULL,
  "caption" TEXT,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "anchor" JSONB,
  "order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetradoAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetradoAttachment_metradoProjectId_fkey" FOREIGN KEY ("metradoProjectId") REFERENCES "MetradoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoAttachment_metradoBlockId_fkey" FOREIGN KEY ("metradoBlockId") REFERENCES "MetradoBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetradoAttachment_metradoItemId_fkey" FOREIGN KEY ("metradoItemId") REFERENCES "MetradoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetradoAttachment_metradoMeasurementLineId_fkey" FOREIGN KEY ("metradoMeasurementLineId") REFERENCES "MetradoMeasurementLine"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetradoAttachment_metradoRebarLineId_fkey" FOREIGN KEY ("metradoRebarLineId") REFERENCES "MetradoRebarLine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- statement
CREATE INDEX IF NOT EXISTS "MetradoProject_projectId_idx" ON "MetradoProject"("projectId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoProject_createdById_idx" ON "MetradoProject"("createdById");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoProject_updatedById_idx" ON "MetradoProject"("updatedById");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoProject_status_idx" ON "MetradoProject"("status");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoProject_createdAt_idx" ON "MetradoProject"("createdAt");
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS "MetradoBlock_metradoProjectId_code_key" ON "MetradoBlock"("metradoProjectId", "code");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoBlock_metradoProjectId_order_idx" ON "MetradoBlock"("metradoProjectId", "order");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoBlock_active_idx" ON "MetradoBlock"("active");
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS "MetradoItem_metradoProjectId_itemCode_key" ON "MetradoItem"("metradoProjectId", "itemCode");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoItem_metradoProjectId_order_idx" ON "MetradoItem"("metradoProjectId", "order");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoItem_parentId_idx" ON "MetradoItem"("parentId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoItem_calculationType_idx" ON "MetradoItem"("calculationType");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoItem_isHeading_idx" ON "MetradoItem"("isHeading");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoMeasurementLine_metradoItemId_idx" ON "MetradoMeasurementLine"("metradoItemId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoMeasurementLine_metradoBlockId_idx" ON "MetradoMeasurementLine"("metradoBlockId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoMeasurementLine_lineType_idx" ON "MetradoMeasurementLine"("lineType");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoMeasurementLine_validationStatus_idx" ON "MetradoMeasurementLine"("validationStatus");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoMeasurementLine_order_idx" ON "MetradoMeasurementLine"("order");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoRebarLine_metradoItemId_idx" ON "MetradoRebarLine"("metradoItemId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoRebarLine_metradoBlockId_idx" ON "MetradoRebarLine"("metradoBlockId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoRebarLine_diameter_idx" ON "MetradoRebarLine"("diameter");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoRebarLine_lineType_idx" ON "MetradoRebarLine"("lineType");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoRebarLine_validationStatus_idx" ON "MetradoRebarLine"("validationStatus");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoRebarLine_order_idx" ON "MetradoRebarLine"("order");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoPlatformadoLine_metradoProjectId_order_idx" ON "MetradoPlatformadoLine"("metradoProjectId", "order");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoPlatformadoLine_lineType_idx" ON "MetradoPlatformadoLine"("lineType");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoPlatformadoLine_validationStatus_idx" ON "MetradoPlatformadoLine"("validationStatus");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoProjectId_idx" ON "MetradoAttachment"("metradoProjectId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoBlockId_idx" ON "MetradoAttachment"("metradoBlockId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoItemId_idx" ON "MetradoAttachment"("metradoItemId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoMeasurementLineId_idx" ON "MetradoAttachment"("metradoMeasurementLineId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoRebarLineId_idx" ON "MetradoAttachment"("metradoRebarLineId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoAttachment_sourceSheet_sourceRow_idx" ON "MetradoAttachment"("sourceSheet", "sourceRow");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoImport_metradoProjectId_idx" ON "MetradoImport"("metradoProjectId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoImport_createdById_idx" ON "MetradoImport"("createdById");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoImport_status_idx" ON "MetradoImport"("status");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoExport_metradoProjectId_idx" ON "MetradoExport"("metradoProjectId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoExport_createdById_idx" ON "MetradoExport"("createdById");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoExport_status_idx" ON "MetradoExport"("status");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoValidationIssue_metradoProjectId_idx" ON "MetradoValidationIssue"("metradoProjectId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoValidationIssue_status_idx" ON "MetradoValidationIssue"("status");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoValidationIssue_sheetName_idx" ON "MetradoValidationIssue"("sheetName");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoEvent_metradoProjectId_idx" ON "MetradoEvent"("metradoProjectId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoEvent_actorId_idx" ON "MetradoEvent"("actorId");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoEvent_eventType_idx" ON "MetradoEvent"("eventType");
-- statement
CREATE INDEX IF NOT EXISTS "MetradoEvent_eventAt_idx" ON "MetradoEvent"("eventAt");
