CREATE TYPE "MeetingLifecycleEventType" AS ENUM ('STARTED', 'ENDED', 'RESUMED');
CREATE TYPE "MeetingActaStatus" AS ENUM ('DRAFT', 'FINAL', 'SUPERSEDED');

CREATE TABLE "MeetingLifecycleEvent" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "MeetingLifecycleEventType" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "actorId" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingActaRevision" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "MeetingActaStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingActaRevision_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CommitmentReview" ADD COLUMN "meetingId" TEXT;

CREATE UNIQUE INDEX "MeetingActaRevision_meetingId_version_key" ON "MeetingActaRevision"("meetingId", "version");
CREATE INDEX "MeetingLifecycleEvent_meetingId_occurredAt_idx" ON "MeetingLifecycleEvent"("meetingId", "occurredAt");
CREATE INDEX "MeetingLifecycleEvent_actorId_idx" ON "MeetingLifecycleEvent"("actorId");
CREATE INDEX "MeetingLifecycleEvent_type_idx" ON "MeetingLifecycleEvent"("type");
CREATE INDEX "MeetingActaRevision_meetingId_status_idx" ON "MeetingActaRevision"("meetingId", "status");
CREATE INDEX "MeetingActaRevision_createdById_idx" ON "MeetingActaRevision"("createdById");
CREATE INDEX "CommitmentReview_meetingId_idx" ON "CommitmentReview"("meetingId");

ALTER TABLE "MeetingLifecycleEvent" ADD CONSTRAINT "MeetingLifecycleEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingLifecycleEvent" ADD CONSTRAINT "MeetingLifecycleEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingActaRevision" ADD CONSTRAINT "MeetingActaRevision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingActaRevision" ADD CONSTRAINT "MeetingActaRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommitmentReview" ADD CONSTRAINT "CommitmentReview_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
