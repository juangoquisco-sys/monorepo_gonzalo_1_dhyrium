import {
  OrganizationalLegacyType,
  OrganizationalMembershipRole,
  OrganizationalUnitType,
} from '@prisma/client';
import type {
  OrganizationalMembership,
  OrganizationalUnit,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { resolveOfficialOrganizationalDirectory } from '@/services/orgDirectory.domain';

type UnitTreeNode = Pick<
  OrganizationalUnit,
  'id' | 'name' | 'codemap' | 'type' | 'parentId' | 'isActive'
> & {
  /** Stable directory identity returned only by the official directory view. */
  directoryKey?: string | null;
  directoryOrder?: number | null;
  isDirectoryVisible?: boolean;
  memberships: Array<
    Pick<
      OrganizationalMembership,
      | 'id'
      | 'userId'
      | 'unitId'
      | 'role'
      | 'positionTitle'
      | 'isPrimary'
      | 'isUnitLead'
      | 'startDate'
      | 'endDate'
    > & {
      user: Prisma.UsersGetPayload<{ select: typeof TREE_USER_SELECT }>;
    }
  >;
  children: UnitTreeNode[];
};

type OrgTreeScope = 'all' | 'directory';

const TREE_USER_SELECT = {
  id: true,
  status: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      dni: true,
    },
  },
} satisfies Prisma.UsersSelect;

type UnitCreateInput = Pick<OrganizationalUnit, 'name' | 'type'> &
  Partial<Pick<OrganizationalUnit, 'codemap' | 'parentId'>>;

type UnitUpdateInput = Partial<
  Pick<
    OrganizationalUnit,
    'name' | 'codemap' | 'type' | 'parentId' | 'isActive'
  >
>;

const UNIT_MUTATION_SELECT = {
  id: true,
  name: true,
  codemap: true,
  type: true,
  parentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationalUnitSelect;

type MembershipCreateInput = Pick<
  OrganizationalMembership,
  | 'userId'
  | 'unitId'
  | 'role'
  | 'positionTitle'
  | 'isPrimary'
  | 'startDate'
  | 'endDate'
>;

type MembershipUpdateInput = Partial<
  Pick<
    OrganizationalMembership,
    | 'userId'
    | 'unitId'
    | 'role'
    | 'positionTitle'
    | 'isPrimary'
    | 'startDate'
    | 'endDate'
  >
>;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  status: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      dni: true,
      job: true,
      degree: true,
      userPc: true,
    },
  },
  role: {
    select: {
      id: true,
      name: true,
      hierarchy: true,
    },
  },
} satisfies Prisma.UsersSelect;

class OrgServices {
  private static toDate(value?: Date | string | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida', 400);
    return date;
  }

  private static assertDateRange(startDate: Date, endDate?: Date | null) {
    if (endDate && endDate < startDate)
      throw new AppError('La fecha fin no puede ser anterior al inicio', 400);
  }

  private static activeWhere(date: Date) {
    return {
      startDate: { lte: date },
      OR: [{ endDate: null }, { endDate: { gte: date } }],
    };
  }

  private static overlapWhere(
    startDate: Date,
    endDate?: Date | null
  ): Prisma.OrganizationalMembershipWhereInput {
    return {
      ...(endDate ? { startDate: { lte: endDate } } : {}),
      OR: [{ endDate: null }, { endDate: { gte: startDate } }],
    };
  }

  private static normalizeMembershipInput(data: MembershipCreateInput) {
    const startDate = this.toDate(data.startDate);
    const endDate = this.toDate(data.endDate);
    if (!startDate) throw new AppError('Ingrese fecha de inicio', 400);
    this.assertDateRange(startDate, endDate);
    return {
      ...data,
      startDate,
      endDate,
      isPrimary: Boolean(data.isPrimary),
    };
  }

  private static buildTree(
    units: Omit<UnitTreeNode, 'children'>[],
    rootId?: string | null
  ) {
    const nodeMap = new Map<string, UnitTreeNode>();
    units.forEach(unit => nodeMap.set(unit.id, { ...unit, children: [] }));

    const roots: UnitTreeNode[] = [];
    units.forEach(unit => {
      const node = nodeMap.get(unit.id);
      if (!node) return;
      const parent = unit.parentId ? nodeMap.get(unit.parentId) : null;
      if (parent) parent.children.push(node);
      else roots.push(node);
    });

    if (rootId) return nodeMap.get(rootId) ?? null;
    return roots;
  }

  private static async assertUnitExists(id: OrganizationalUnit['id']) {
    const unit = await prisma.organizationalUnit.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!unit) throw new AppError('Unidad organizacional no encontrada', 404);
  }

  private static async assertActiveUser(
    id: OrganizationalMembership['userId']
  ) {
    const user = await prisma.users.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (!user.status)
      throw new AppError(
        'Solo usuarios activos pueden asignarse al organigrama',
        400
      );
  }

  private static async assertNoHierarchyCycle(
    unitId: OrganizationalUnit['id'],
    parentId?: OrganizationalUnit['parentId']
  ) {
    if (!parentId) return;
    if (unitId === parentId)
      throw new AppError('Una unidad no puede ser su propio padre', 400);

    let currentParentId: string | null = parentId;
    const visited = new Set<string>();
    while (currentParentId) {
      if (currentParentId === unitId)
        throw new AppError('El movimiento genera un ciclo organizacional', 400);
      if (visited.has(currentParentId))
        throw new AppError('Jerarquia organizacional invalida', 400);
      visited.add(currentParentId);
      const parent: Pick<OrganizationalUnit, 'parentId'> | null =
        await prisma.organizationalUnit.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
      if (!parent)
        throw new AppError('Padre organizacional no encontrado', 404);
      currentParentId = parent.parentId;
    }
  }

  private static async assertMembershipRules(data: {
    id?: OrganizationalMembership['id'];
    userId: OrganizationalMembership['userId'];
    unitId: OrganizationalMembership['unitId'];
    role: OrganizationalMembership['role'];
    isPrimary: OrganizationalMembership['isPrimary'];
    startDate: OrganizationalMembership['startDate'];
    endDate?: OrganizationalMembership['endDate'];
  }) {
    const idFilter = data.id ? { id: { not: data.id } } : {};
    const overlappingSameRole = await prisma.organizationalMembership.findFirst(
      {
        where: {
          ...idFilter,
          userId: data.userId,
          unitId: data.unitId,
          role: data.role,
          ...this.overlapWhere(data.startDate, data.endDate),
        },
        select: { id: true },
      }
    );
    if (overlappingSameRole)
      throw new AppError(
        'Ya existe una asignacion superpuesta para el usuario, unidad y rol',
        400
      );

    if (!data.isPrimary) return;
    const overlappingPrimary = await prisma.organizationalMembership.findFirst({
      where: {
        ...idFilter,
        userId: data.userId,
        isPrimary: true,
        ...this.overlapWhere(data.startDate, data.endDate),
      },
      select: { id: true },
    });
    if (overlappingPrimary)
      throw new AppError(
        'El usuario ya tiene una asignacion primaria vigente',
        400
      );
  }

  public static async getTree(
    rootId?: string,
    scope: OrgTreeScope = 'all'
  ) {
    const now = new Date();
    const units = await prisma.organizationalUnit.findMany({
      select: {
        id: true,
        name: true,
        codemap: true,
        type: true,
        parentId: true,
        isActive: true,
        legacyMap: {
          select: {
            legacyType: true,
            legacyId: true,
          },
        },
        memberships: {
          where: {
            user: { status: true },
            ...this.activeWhere(now),
          },
          select: {
            id: true,
            userId: true,
            unitId: true,
            role: true,
            positionTitle: true,
            isPrimary: true,
            isUnitLead: true,
            startDate: true,
            endDate: true,
            user: { select: TREE_USER_SELECT },
          },
          orderBy: [
            { isUnitLead: 'desc' },
            { isPrimary: 'desc' },
            { role: 'asc' },
          ],
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    if (scope === 'all') {
      return this.buildTree(
        units.map(({ legacyMap: _legacyMap, ...unit }) => unit),
        rootId
      );
    }

    const directory = resolveOfficialOrganizationalDirectory(
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
    if (directory.blockers.length) {
      throw new AppError(
        `No se puede publicar el directorio oficial: ${directory.blockers.join(
          ' '
        )}`,
        409
      );
    }

    const unitById = new Map(units.map(unit => [unit.id, unit]));
    const idByDirectoryKey = new Map(
      directory.units.map(unit => [unit.definition.directoryKey, unit.unitId])
    );
    const directoryUnits = directory.units.map((unit, directoryOrder) => {
      if (!unit.unitId)
        throw new AppError('La unidad oficial no pudo resolverse', 409);

      const sourceUnit = unitById.get(unit.unitId);
      if (!sourceUnit)
        throw new AppError('La unidad oficial no existe en el directorio', 409);

      const parentId = unit.definition.parentDirectoryKey
        ? idByDirectoryKey.get(unit.definition.parentDirectoryKey)
        : null;
      if (unit.definition.parentDirectoryKey && !parentId)
        throw new AppError('El padre oficial no pudo resolverse', 409);

      const { legacyMap: _legacyMap, ...treeUnit } = sourceUnit;
      return {
        ...treeUnit,
        codemap: unit.definition.displayCode,
        parentId: parentId ?? null,
        directoryKey: unit.definition.directoryKey,
        directoryOrder: directoryOrder + 1,
        isDirectoryVisible: true,
      };
    });

    return this.buildTree(directoryUnits, rootId);
  }

  public static async createUnit(data: UnitCreateInput) {
    if (data.parentId) await this.assertUnitExists(data.parentId);
    return prisma.organizationalUnit.create({
      data: {
        name: data.name,
        codemap: data.codemap ?? null,
        type: data.type,
        parentId: data.parentId ?? null,
      },
      // La selección explícita evita que un cliente Prisma desfasado solicite
      // columnas ajenas al contrato vigente al devolver la mutación.
      select: UNIT_MUTATION_SELECT,
    });
  }

  public static async updateUnit(
    id: OrganizationalUnit['id'],
    data: UnitUpdateInput
  ) {
    await this.assertUnitExists(id);
    if (data.parentId !== undefined) {
      if (data.parentId) await this.assertUnitExists(data.parentId);
      await this.assertNoHierarchyCycle(id, data.parentId);
    }
    return prisma.organizationalUnit.update({
      where: { id },
      data: {
        name: data.name,
        codemap: data.codemap,
        type: data.type,
        ...(data.parentId !== undefined
          ? { parentId: data.parentId ?? null }
          : {}),
        isActive: data.isActive,
      },
      select: UNIT_MUTATION_SELECT,
    });
  }

  public static async moveUnit(
    id: OrganizationalUnit['id'],
    parentId?: OrganizationalUnit['parentId']
  ) {
    await this.assertUnitExists(id);
    await this.assertNoHierarchyCycle(id, parentId);
    return prisma.organizationalUnit.update({
      where: { id },
      data: { parentId: parentId || null },
      select: UNIT_MUTATION_SELECT,
    });
  }

  public static async deactivateUnit(id: OrganizationalUnit['id']) {
    await this.assertUnitExists(id);
    return prisma.organizationalUnit.update({
      where: { id },
      data: { isActive: false },
      select: UNIT_MUTATION_SELECT,
    });
  }

  public static async getMembers(
    unitId: OrganizationalUnit['id'],
    date = new Date()
  ) {
    await this.assertUnitExists(unitId);
    return prisma.organizationalMembership.findMany({
      where: {
        unitId,
        user: { status: true },
        ...this.activeWhere(date),
      },
      include: {
        user: {
          select: SAFE_USER_SELECT,
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
    });
  }

  public static async getUserUnits(userId: number, date = new Date()) {
    return prisma.organizationalMembership.findMany({
      where: {
        userId,
        user: { status: true },
        ...this.activeWhere(date),
      },
      include: {
        unit: {
          include: {
            legacyMap: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
    });
  }

  public static async getActiveUsers(date = new Date()) {
    return prisma.organizationalMembership.findMany({
      where: {
        ...this.activeWhere(date),
        user: { status: true },
      },
      distinct: ['userId'],
      include: {
        user: {
          select: SAFE_USER_SELECT,
        },
      },
      orderBy: { userId: 'asc' },
    });
  }

  public static async createMembership(data: MembershipCreateInput) {
    const normalized = this.normalizeMembershipInput(data);
    await this.assertUnitExists(normalized.unitId);
    await this.assertActiveUser(normalized.userId);
    await this.assertMembershipRules(normalized);
    return prisma.organizationalMembership.create({
      data: normalized,
    });
  }

  public static async updateMembership(
    id: OrganizationalMembership['id'],
    data: MembershipUpdateInput
  ) {
    const existing = await prisma.organizationalMembership.findUnique({
      where: { id },
    });
    if (!existing) throw new AppError('Asignacion no encontrada', 404);

    const userId = data.userId ?? existing.userId;
    const unitId = data.unitId ?? existing.unitId;
    const startDate = this.toDate(data.startDate) ?? existing.startDate;
    const endDate =
      data.endDate === undefined ? existing.endDate : this.toDate(data.endDate);
    const role = data.role ?? existing.role;
    const isPrimary = data.isPrimary ?? existing.isPrimary;
    await this.assertUnitExists(unitId);
    await this.assertActiveUser(userId);
    this.assertDateRange(startDate, endDate);
    await this.assertMembershipRules({
      id,
      userId,
      unitId,
      role,
      isPrimary,
      startDate,
      endDate,
    });

    return prisma.organizationalMembership.update({
      where: { id },
      data: {
        userId,
        unitId,
        role,
        positionTitle: data.positionTitle,
        isPrimary,
        startDate,
        endDate,
      },
    });
  }

  public static async terminateMembership(
    id: OrganizationalMembership['id'],
    endDate = new Date()
  ) {
    const membership = await prisma.organizationalMembership.findUnique({
      where: { id },
      select: { startDate: true },
    });
    if (!membership) throw new AppError('Asignacion no encontrada', 404);
    this.assertDateRange(membership.startDate, endDate);
    return prisma.organizationalMembership.update({
      where: { id },
      data: { endDate },
    });
  }

  public static async findLegacyUnit(
    legacyType: OrganizationalLegacyType,
    legacyId: number
  ) {
    return prisma.organizationalUnitLegacyMap.findUnique({
      where: {
        legacyType_legacyId: {
          legacyType,
          legacyId,
        },
      },
      include: {
        unit: true,
      },
    });
  }
}

export {
  OrganizationalLegacyType,
  OrganizationalMembershipRole,
  OrganizationalUnitType,
};
export default OrgServices;
