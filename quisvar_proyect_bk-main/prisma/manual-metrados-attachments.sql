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

CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoProjectId_idx" ON "MetradoAttachment"("metradoProjectId");
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoBlockId_idx" ON "MetradoAttachment"("metradoBlockId");
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoItemId_idx" ON "MetradoAttachment"("metradoItemId");
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoMeasurementLineId_idx" ON "MetradoAttachment"("metradoMeasurementLineId");
CREATE INDEX IF NOT EXISTS "MetradoAttachment_metradoRebarLineId_idx" ON "MetradoAttachment"("metradoRebarLineId");
CREATE INDEX IF NOT EXISTS "MetradoAttachment_sourceSheet_sourceRow_idx" ON "MetradoAttachment"("sourceSheet", "sourceRow");
