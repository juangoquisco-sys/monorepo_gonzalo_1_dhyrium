-- Dhyrium Desktop keeps immutable versions outside the public uploads tree.
CREATE TYPE "DesktopDocumentSourceKind" AS ENUM ('TASK_FILE', 'BASIC_FILE');
CREATE TYPE "DesktopDocumentVersionSource" AS ENUM ('ORIGINAL_IMPORT', 'DESKTOP_SAVE');

CREATE TABLE "DesktopDocument" (
  "id" TEXT NOT NULL,
  "sourceKind" "DesktopDocumentSourceKind" NOT NULL,
  "sourceFileId" INTEGER,
  "sourceBasicFileId" INTEGER,
  "originalName" VARCHAR(300) NOT NULL,
  "extension" VARCHAR(32) NOT NULL,
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "createdById" INTEGER NOT NULL,
  "updatedById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesktopDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DesktopDocument_source_identity_check" CHECK (
    ("sourceKind" = 'TASK_FILE' AND "sourceFileId" IS NOT NULL AND "sourceBasicFileId" IS NULL) OR
    ("sourceKind" = 'BASIC_FILE' AND "sourceFileId" IS NULL AND "sourceBasicFileId" IS NOT NULL)
  )
);

CREATE TABLE "DesktopDocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "storageKey" VARCHAR(500) NOT NULL,
  "originalName" VARCHAR(300) NOT NULL,
  "mimeType" VARCHAR(150) NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "checksumSha256" VARCHAR(64) NOT NULL,
  "source" "DesktopDocumentVersionSource" NOT NULL,
  "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesktopDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DesktopDocumentLaunchTicket" (
  "id" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "userId" INTEGER NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesktopDocumentLaunchTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesktopDocument_sourceFileId_key" ON "DesktopDocument"("sourceFileId");
CREATE UNIQUE INDEX "DesktopDocument_sourceBasicFileId_key" ON "DesktopDocument"("sourceBasicFileId");
CREATE INDEX "DesktopDocument_updatedAt_idx" ON "DesktopDocument"("updatedAt");
CREATE INDEX "DesktopDocument_createdById_idx" ON "DesktopDocument"("createdById");
CREATE INDEX "DesktopDocument_updatedById_idx" ON "DesktopDocument"("updatedById");

CREATE UNIQUE INDEX "DesktopDocumentVersion_storageKey_key" ON "DesktopDocumentVersion"("storageKey");
CREATE UNIQUE INDEX "DesktopDocumentVersion_documentId_versionNumber_key" ON "DesktopDocumentVersion"("documentId", "versionNumber");
CREATE INDEX "DesktopDocumentVersion_documentId_createdAt_idx" ON "DesktopDocumentVersion"("documentId", "createdAt");
CREATE INDEX "DesktopDocumentVersion_createdById_idx" ON "DesktopDocumentVersion"("createdById");

CREATE UNIQUE INDEX "DesktopDocumentLaunchTicket_tokenHash_key" ON "DesktopDocumentLaunchTicket"("tokenHash");
CREATE INDEX "DesktopDocumentLaunchTicket_expiresAt_idx" ON "DesktopDocumentLaunchTicket"("expiresAt");
CREATE INDEX "DesktopDocumentLaunchTicket_userId_createdAt_idx" ON "DesktopDocumentLaunchTicket"("userId", "createdAt");
CREATE INDEX "DesktopDocumentLaunchTicket_documentId_createdAt_idx" ON "DesktopDocumentLaunchTicket"("documentId", "createdAt");

ALTER TABLE "DesktopDocument"
  ADD CONSTRAINT "DesktopDocument_sourceFileId_fkey"
  FOREIGN KEY ("sourceFileId") REFERENCES "Files"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DesktopDocument_sourceBasicFileId_fkey"
  FOREIGN KEY ("sourceBasicFileId") REFERENCES "BasicFiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DesktopDocument_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DesktopDocument_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DesktopDocumentVersion"
  ADD CONSTRAINT "DesktopDocumentVersion_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "DesktopDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DesktopDocumentVersion_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DesktopDocumentLaunchTicket"
  ADD CONSTRAINT "DesktopDocumentLaunchTicket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DesktopDocumentLaunchTicket_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "DesktopDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DesktopDocumentLaunchTicket_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "DesktopDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
