INSERT INTO "OrganizationalUnitMeetingViewConfig" ("id", "unitId", "defaultScope", "defaultView", "visibleViews", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", 'DESCENDANTS', 'MEMBERS',
  ARRAY['UNITS', 'TECHNICAL_TREE', 'MEMBERS']::"MeetingWorkspaceView"[], CURRENT_TIMESTAMP
FROM "OrganizationalUnit"
WHERE REGEXP_REPLACE(UPPER("name"), '\\s+', ' ', 'g')
  IN ('GERENCIA ADMINISTRATIVA', 'GERENTE ADMINISTRATIVO')
ON CONFLICT ("unitId") DO NOTHING;
