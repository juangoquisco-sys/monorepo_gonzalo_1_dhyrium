-- Grants Comeya to existing administrator roles after deploying its menu catalog.
INSERT INTO "MenuPoints" ("typeRol", "menuId", "roleId")
SELECT 'MOD', 17, role."id"
FROM "Role" role
WHERE NOT EXISTS (
  SELECT 1
  FROM "MenuPoints" menu_point
  WHERE menu_point."roleId" = role."id"
    AND menu_point."menuId" = 17
  );
