CREATE TYPE "MeetingScope" AS ENUM ('SELF', 'DESCENDANTS');
CREATE TYPE "MeetingWorkspaceView" AS ENUM ('UNITS', 'TECHNICAL_TREE', 'MEMBERS', 'PROJECTS_MEMBERS');

ALTER TABLE "Meeting"
  ADD COLUMN "scope" "MeetingScope" NOT NULL DEFAULT 'DESCENDANTS',
  ADD COLUMN "defaultView" "MeetingWorkspaceView" NOT NULL DEFAULT 'UNITS',
  ADD COLUMN "visibleViews" "MeetingWorkspaceView"[] NOT NULL DEFAULT ARRAY['UNITS', 'TECHNICAL_TREE', 'MEMBERS', 'PROJECTS_MEMBERS']::"MeetingWorkspaceView"[];

CREATE TABLE "OrganizationalUnitMeetingViewConfig" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "defaultScope" "MeetingScope" NOT NULL DEFAULT 'SELF',
  "defaultView" "MeetingWorkspaceView" NOT NULL DEFAULT 'UNITS',
  "visibleViews" "MeetingWorkspaceView"[] NOT NULL DEFAULT ARRAY['UNITS', 'TECHNICAL_TREE', 'MEMBERS', 'PROJECTS_MEMBERS']::"MeetingWorkspaceView"[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationalUnitMeetingViewConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationalUnitMeetingViewConfig_unitId_key"
  ON "OrganizationalUnitMeetingViewConfig"("unitId");
ALTER TABLE "OrganizationalUnitMeetingViewConfig"
  ADD CONSTRAINT "OrganizationalUnitMeetingViewConfig_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "OrganizationalUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OrganizationalUnitMeetingViewConfig" ("id", "unitId", "defaultScope", "defaultView", "visibleViews", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", 'DESCENDANTS', 'UNITS',
  ARRAY['UNITS', 'TECHNICAL_TREE', 'MEMBERS', 'PROJECTS_MEMBERS']::"MeetingWorkspaceView"[], CURRENT_TIMESTAMP
FROM "OrganizationalUnit"
WHERE UPPER("name") = 'GERENCIA GENERAL'
ON CONFLICT ("unitId") DO NOTHING;

INSERT INTO "OrganizationalUnitMeetingViewConfig" ("id", "unitId", "defaultScope", "defaultView", "visibleViews", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", 'DESCENDANTS', 'MEMBERS',
  ARRAY['UNITS', 'TECHNICAL_TREE', 'MEMBERS']::"MeetingWorkspaceView"[], CURRENT_TIMESTAMP
FROM "OrganizationalUnit"
WHERE UPPER("name") IN ('GERENCIA ADMINISTRATIVA', 'GERENTE ADMINISTRATIVO')
ON CONFLICT ("unitId") DO NOTHING;
