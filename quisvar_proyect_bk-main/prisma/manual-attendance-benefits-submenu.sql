-- Grants the Benefits tab to every existing attendance moderator role.
-- Run after deploying the menu catalog update.
INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT 'MOD', 4, menu_point."id"
FROM "MenuPoints" menu_point
WHERE menu_point."menuId" = 4
  AND menu_point."typeRol" = 'MOD'
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" submenu
    WHERE submenu."menuPointsId" = menu_point."id"
      AND submenu."menuId" = 4
  );
