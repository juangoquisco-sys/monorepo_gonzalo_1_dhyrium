INSERT INTO "SubMenuPoints" ("typeRol", "menuId", "menuPointsId")
SELECT 'MOD', 3, mp."id"
FROM "MenuPoints" mp
WHERE mp."menuId" = 13
  AND NOT EXISTS (
    SELECT 1
    FROM "SubMenuPoints" smp
    WHERE smp."menuPointsId" = mp."id"
      AND smp."menuId" = 3
  );
