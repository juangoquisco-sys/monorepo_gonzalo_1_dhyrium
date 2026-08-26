import '@/config/env';
import {
  OrganizationalLegacyType,
  OrganizationalMembershipRole,
  OrganizationalUnitType,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

const apply = process.argv.includes('--apply');
const startDate = new Date();

type Summary = {
  mode: 'dry-run' | 'apply';
  legacy: Record<string, number>;
  units: Record<string, number>;
  memberships: Record<string, number>;
  validation: Record<string, number>;
};

const summary: Summary = {
  mode: apply ? 'apply' : 'dry-run',
  legacy: {},
  units: {
    existingMaps: 0,
    createdSystem: 0,
    createdLegacy: 0,
    wouldCreateSystem: 0,
    wouldCreateLegacy: 0,
  },
  memberships: {
    created: 0,
    skippedExisting: 0,
    wouldCreate: 0,
  },
  validation: {},
};

const unitIdByLegacy = new Map<string, string>();

const legacyKey = (legacyType: OrganizationalLegacyType, legacyId: number) =>
  `${legacyType}:${legacyId}`;

async function ensureSystemUnit(
  name: string,
  codemap: string,
  type: OrganizationalUnitType,
  parentId?: string | null
) {
  const existing = await prisma.organizationalUnit.findFirst({
    where: { codemap },
    select: { id: true },
  });
  if (existing) return existing.id;
  if (!apply) {
    summary.units.wouldCreateSystem += 1;
    return `dry-run:${codemap}`;
  }
  const unit = await prisma.organizationalUnit.create({
    data: {
      name,
      codemap,
      type,
      parentId: parentId?.startsWith('dry-run:') ? null : parentId,
    },
    select: { id: true },
  });
  summary.units.createdSystem += 1;
  return unit.id;
}

async function ensureLegacyUnit({
  legacyType,
  legacyId,
  name,
  codemap,
  type,
  parentId,
}: {
  legacyType: OrganizationalLegacyType;
  legacyId: number;
  name: string;
  codemap?: string | null;
  type: OrganizationalUnitType;
  parentId?: string | null;
}) {
  const existing = await prisma.organizationalUnitLegacyMap.findUnique({
    where: {
      legacyType_legacyId: {
        legacyType,
        legacyId,
      },
    },
    select: { unitId: true },
  });
  if (existing) {
    summary.units.existingMaps += 1;
    unitIdByLegacy.set(legacyKey(legacyType, legacyId), existing.unitId);
    return existing.unitId;
  }

  if (!apply) {
    const dryId = `dry-run:${legacyType}:${legacyId}`;
    summary.units.wouldCreateLegacy += 1;
    unitIdByLegacy.set(legacyKey(legacyType, legacyId), dryId);
    return dryId;
  }

  const unit = await prisma.organizationalUnit.create({
    data: {
      name,
      codemap,
      type,
      parentId: parentId?.startsWith('dry-run:') ? null : parentId,
      legacyMap: {
        create: {
          legacyType,
          legacyId,
        },
      },
    },
    select: { id: true },
  });
  summary.units.createdLegacy += 1;
  unitIdByLegacy.set(legacyKey(legacyType, legacyId), unit.id);
  return unit.id;
}

async function ensureMembership({
  userId,
  unitId,
  role,
  isPrimary = false,
}: {
  userId: number;
  unitId: string;
  role: OrganizationalMembershipRole;
  isPrimary?: boolean;
}) {
  if (unitId.startsWith('dry-run:')) {
    summary.memberships.wouldCreate += 1;
    return;
  }
  const existing = await prisma.organizationalMembership.findFirst({
    where: {
      userId,
      unitId,
      role,
      OR: [{ endDate: null }, { endDate: { gte: startDate } }],
    },
    select: { id: true },
  });
  if (existing) {
    summary.memberships.skippedExisting += 1;
    return;
  }
  if (!apply) {
    summary.memberships.wouldCreate += 1;
    return;
  }
  await prisma.organizationalMembership.create({
    data: {
      userId,
      unitId,
      role,
      isPrimary,
      startDate,
    },
  });
  summary.memberships.created += 1;
}

async function main() {
  const [offices, divisions, groups, groupUsers, officeUsers] =
    await Promise.all([
      prisma.office.findMany({ orderBy: { id: 'asc' } }),
      prisma.division.findMany({
        include: { leaders: { select: { id: true } } },
        orderBy: { id: 'asc' },
      }),
      prisma.group.findMany({ orderBy: [{ gNumber: 'asc' }, { id: 'asc' }] }),
      prisma.groupOnUsers.findMany({ orderBy: [{ groupId: 'asc' }] }),
      prisma.userToOffice.findMany({ orderBy: [{ officeId: 'asc' }] }),
    ]);

  summary.legacy = {
    offices: offices.length,
    divisions: divisions.length,
    groups: groups.length,
    groupMemberships: groupUsers.length,
    officeMemberships: officeUsers.length,
    divisionLeaders: divisions.reduce(
      (total, division) => total + division.leaders.length,
      0
    ),
  };

  const rootId = await ensureSystemUnit(
    'ERP Organization',
    'ERP_ORG_ROOT',
    OrganizationalUnitType.GERENCIA
  );
  const officesRootId = await ensureSystemUnit(
    'Procedure Offices',
    'ERP_PROCEDURE_OFFICES',
    OrganizationalUnitType.OFICINA,
    rootId
  );
  const unassignedGroupsId = await ensureSystemUnit(
    'Unassigned Groups',
    'ERP_UNASSIGNED_GROUPS',
    OrganizationalUnitType.OFICINA,
    rootId
  );

  for (const division of divisions) {
    const isGerencia = division.name.toLowerCase().includes('gerencia');
    await ensureLegacyUnit({
      legacyType: OrganizationalLegacyType.DIVISION,
      legacyId: division.id,
      name: division.name,
      codemap: `DIVISION:${division.id}`,
      type: isGerencia
        ? OrganizationalUnitType.GERENCIA
        : OrganizationalUnitType.OFICINA,
      parentId: rootId,
    });
  }

  for (const office of offices) {
    const isGerencia = office.name.toLowerCase().includes('gerencia');
    await ensureLegacyUnit({
      legacyType: OrganizationalLegacyType.OFFICE,
      legacyId: office.id,
      name: office.name,
      codemap: `OFFICE:${office.id}`,
      type: isGerencia
        ? OrganizationalUnitType.GERENCIA
        : OrganizationalUnitType.OFICINA,
      parentId: officesRootId,
    });
  }

  for (const group of groups) {
    const divisionUnitId = group.divisionId
      ? unitIdByLegacy.get(
          legacyKey(OrganizationalLegacyType.DIVISION, group.divisionId)
        )
      : null;
    await ensureLegacyUnit({
      legacyType: OrganizationalLegacyType.GROUP,
      legacyId: group.id,
      name: group.name,
      codemap: `GROUP:${group.id}`,
      type: OrganizationalUnitType.GRUPO,
      parentId: divisionUnitId ?? unassignedGroupsId,
    });
  }

  for (const groupUser of groupUsers) {
    const unitId = unitIdByLegacy.get(
      legacyKey(OrganizationalLegacyType.GROUP, groupUser.groupId)
    );
    if (!unitId) continue;
    const role = groupUser.mod
      ? OrganizationalMembershipRole.COORDINADOR
      : groupUser.guest
      ? OrganizationalMembershipRole.APOYO
      : OrganizationalMembershipRole.ESPECIALISTA;
    await ensureMembership({
      userId: groupUser.userId,
      unitId,
      role,
    });
  }

  for (const officeUser of officeUsers) {
    const unitId = unitIdByLegacy.get(
      legacyKey(OrganizationalLegacyType.OFFICE, officeUser.officeId)
    );
    if (!unitId) continue;
    await ensureMembership({
      userId: officeUser.usersId,
      unitId,
      role: officeUser.isOfficeManager
        ? OrganizationalMembershipRole.JEFE
        : OrganizationalMembershipRole.ASISTENTE,
    });
  }

  for (const division of divisions) {
    const unitId = unitIdByLegacy.get(
      legacyKey(OrganizationalLegacyType.DIVISION, division.id)
    );
    if (!unitId) continue;
    for (const leader of division.leaders) {
      await ensureMembership({
        userId: leader.id,
        unitId,
        role: OrganizationalMembershipRole.JEFE,
        isPrimary: false,
      });
    }
  }

  if (apply) {
    const mappedGroupRows = await prisma.organizationalUnitLegacyMap.findMany({
      where: { legacyType: OrganizationalLegacyType.GROUP },
      select: { legacyId: true },
    });
    const mappedGroupIds = mappedGroupRows.map(({ legacyId }) => legacyId);
    const groupedStagesWithoutMap = await prisma.stages.count({
      where: {
        groupId: {
          not: null,
          notIn: mappedGroupIds,
        },
      },
    });
    summary.validation = {
      mappedGroups: mappedGroupIds.length,
      groupedStagesWithoutMap,
    };
  } else {
    summary.validation = {
      expectedMappedGroupsAfterApply: groups.length,
      groupedStagesPreserved: await prisma.stages.count({
        where: { groupId: { not: null } },
      }),
    };
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
