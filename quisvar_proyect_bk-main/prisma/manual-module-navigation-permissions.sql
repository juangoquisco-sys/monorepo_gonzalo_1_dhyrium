-- Idempotent navigation grants retained from the former migration history.
-- Run after the relevant MenuPoints and role seed data exists.

BEGIN;

-- Duty rotations: list and administration submenus.
INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT 'MOD', 1, menu_point."id"
FROM "MenuPoints" menu_point
WHERE menu_point."menuId" = 13
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" submenu
    WHERE submenu."menuPointsId" = menu_point."id"
      AND submenu."menuId" = 1
  );

INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT 'MOD', 2, menu_point."id"
FROM "MenuPoints" menu_point
WHERE menu_point."menuId" = 13
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" submenu
    WHERE submenu."menuPointsId" = menu_point."id"
      AND submenu."menuId" = 2
  );

-- Gate control: moderator submenus.
INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT 'MOD', submenu_id."id", menu_point."id"
FROM "MenuPoints" menu_point
CROSS JOIN (VALUES (1), (2), (3), (4)) AS submenu_id("id")
WHERE menu_point."menuId" = 14
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" submenu
    WHERE submenu."menuPointsId" = menu_point."id"
      AND submenu."menuId" = submenu_id."id"
  );

-- Gate control: self-service user submenu.
INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT 'USER', 4, menu_point."id"
FROM "MenuPoints" menu_point
WHERE menu_point."menuId" = 14
  AND menu_point."typeRol" = 'USER'
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" submenu
    WHERE submenu."menuPointsId" = menu_point."id"
      AND submenu."menuId" = 4
  );

COMMIT;
