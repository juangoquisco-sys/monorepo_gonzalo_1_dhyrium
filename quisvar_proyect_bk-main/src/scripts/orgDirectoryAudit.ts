import '@/config/env';
import { auditOrganizationalDirectory } from '@/services/orgDirectory.domain';
import { prisma } from '@/utils/prisma.server';

/**
 * Auditoría estrictamente de lectura. No acepta --apply ni ejecuta mutaciones.
 * Ejecutar: npx ts-node src/scripts/orgDirectoryAudit.ts
 */
async function main() {
  if (process.argv.some(argument => argument === '--apply' || argument === '--write')) {
    throw new Error('Esta auditoría es de solo lectura y no admite acciones de escritura.');
  }

  const units = await prisma.organizationalUnit.findMany({
    select: {
      id: true,
      name: true,
      codemap: true,
      type: true,
      parentId: true,
      isActive: true,
      legacyMap: { select: { legacyType: true, legacyId: true } },
      memberships: {
        where: { endDate: null },
        select: { id: true },
      },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });

  const report = auditOrganizationalDirectory(
    units.map(unit => ({
      id: unit.id,
      name: unit.name,
      codemap: unit.codemap,
      type: unit.type,
      parentId: unit.parentId,
      isActive: unit.isActive,
      legacyMap: unit.legacyMap,
      activeMembershipCount: unit.memberships.length,
    }))
  );

  console.log(JSON.stringify(report, null, 2));
  if (report.blockers.length) process.exitCode = 2;
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
