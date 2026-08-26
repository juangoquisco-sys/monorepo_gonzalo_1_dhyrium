INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT
  CASE
    WHEN r."name" IN ('Gerente General', 'Gerente') THEN 'MOD'::"MenuRol"
    ELSE 'USER'::"MenuRol"
  END,
  6,
  mp."id"
FROM "MenuPoints" mp
JOIN "Role" r ON r."id" = mp."roleId"
WHERE mp."menuId" = 2
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" sm
    WHERE sm."menuPointsId" = mp."id"
      AND sm."menuId" = 6
  );
