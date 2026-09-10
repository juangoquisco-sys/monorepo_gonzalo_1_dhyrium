-- Preserve access for roles that already administer the user center while
-- introducing the explicit Factura personalizada permission (menuId 16).
INSERT INTO "MenuPoints" ("typeRol", "menuId", "roleId")
SELECT 'MOD', 16, role_row."id"
FROM "Role" role_row
WHERE EXISTS (
  SELECT 1
  FROM "MenuPoints" menu_point
  WHERE menu_point."roleId" = role_row."id"
    AND menu_point."menuId" = 5
    AND menu_point."typeRol" = 'MOD'
)
AND NOT EXISTS (
  SELECT 1
  FROM "MenuPoints" menu_point
  WHERE menu_point."roleId" = role_row."id"
    AND menu_point."menuId" = 16
);
