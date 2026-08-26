import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { MenuRole } from '@/models/menuPoints';
import {
  resolveLegacyCanonicalDirectoryKey,
  resolveOfficialOrganizationalDirectory,
} from '@/services/orgDirectory.domain';

class MeetingPermissionService {
  /**
   * Mantiene acceso a una unidad oficial para usuarios que aún tienen una
   * membresía heredada equivalente. La relación histórica no se actualiza ni
   * se elimina: esta compatibilidad solo se usa al verificar permisos.
   */
  private static async compatibleUnitIds(unitId: string) {
    const units = await prisma.organizationalUnit.findMany({
      select: {
        id: true,
        name: true,
        codemap: true,
        type: true,
        parentId: true,
        isActive: true,
        legacyMap: {
          select: { legacyType: true, legacyId: true },
        },
      },
    });
    const directory = resolveOfficialOrganizationalDirectory(
      units.map(unit => ({ ...unit, activeMembershipCount: 0 }))
    );
    const officialUnit = directory.units.find(unit => unit.unitId === unitId);
    if (!officialUnit || directory.blockers.length) return [unitId];

    return units
      .filter(
        unit =>
          unit.id === unitId ||
          resolveLegacyCanonicalDirectoryKey(unit) ===
            officialUnit.definition.directoryKey
      )
      .map(unit => unit.id);
  }

  /**
   * Resuelve las fuentes de lectura de una unidad canónica después de validar
   * el acceso del actor. Solo reúne equivalencias heredadas declaradas en el
   * directorio oficial; no cambia membresías ni amplía la jerarquía física.
   */
  public static async resolveReadableUnitScope(
    userInfo: UserType,
    unitId: string
  ) {
    await this.assertCanReadUnit(userInfo, unitId);
    return {
      canonicalUnitId: unitId,
      sourceUnitIds: Array.from(
        new Set(await this.compatibleUnitIds(unitId))
      ),
    };
  }

  public static hasModuleRole(userInfo: UserType, roles: MenuRole[]) {
    return userInfo.role.menuPoints.some(
      menuPoint =>
        menuPoint.route === 'grupos' && roles.includes(menuPoint.typeRol)
    );
  }

  public static assertModuleRole(userInfo: UserType, roles: MenuRole[]) {
    if (!this.hasModuleRole(userInfo, roles))
      throw new AppError('No tiene permisos para esta accion', 403);
  }

  public static async isUnitMember(userId: number, unitId: string) {
    const compatibleUnitIds = await this.compatibleUnitIds(unitId);
    const membership = await prisma.organizationalMembership.findFirst({
      where: {
        userId,
        unitId: { in: compatibleUnitIds },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { id: true },
    });
    return !!membership;
  }

  public static async canManageUnitProjects(userId: number, unitId: string) {
    const compatibleUnitIds = await this.compatibleUnitIds(unitId);
    const membership = await prisma.organizationalMembership.findFirst({
      where: {
        userId,
        unitId: { in: compatibleUnitIds },
        canManageUnitProjects: true,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { id: true },
    });
    return !!membership;
  }

  public static async assertCanReadUnit(userInfo: UserType, unitId: string) {
    if (this.hasModuleRole(userInfo, ['MOD'])) return;
    this.assertModuleRole(userInfo, ['MEMBER', 'VIEWER', 'USER']);
    const isMember = await this.isUnitMember(userInfo.id, unitId);
    if (!isMember)
      throw new AppError('No pertenece a esta unidad organizacional', 403);
  }

  public static assertCanManageMeetings(userInfo: UserType) {
    this.assertModuleRole(userInfo, ['MOD']);
  }

  public static async assertCanManageUnitProjects(
    userInfo: UserType,
    unitId?: string
  ) {
    if (this.hasModuleRole(userInfo, ['MOD'])) return;
    if (!unitId) throw new AppError('No tiene permisos para esta accion', 403);
    this.assertModuleRole(userInfo, ['MEMBER', 'USER']);
    const canManage = await this.canManageUnitProjects(userInfo.id, unitId);
    if (!canManage)
      throw new AppError(
        'No puede administrar proyectos de esta unidad organizacional',
        403
      );
  }

  public static async assertCanCreateReport(
    userInfo: UserType,
    unitId: string,
    presenterType?: string
  ) {
    if (this.hasModuleRole(userInfo, ['MOD'])) return;
    this.assertModuleRole(userInfo, ['MEMBER', 'USER']);
    const canManageUnit = await this.canManageUnitProjects(userInfo.id, unitId);
    if (presenterType === 'GROUP' && !canManageUnit)
      throw new AppError(
        'Solo MOD o MOD de oficina puede crear informes grupales',
        403
      );
    const isMember = await this.isUnitMember(userInfo.id, unitId);
    if (!isMember)
      throw new AppError('No puede crear informes para esta unidad', 403);
  }

  public static async assertCanEditReport(
    userInfo: UserType,
    reportId: string
  ) {
    const report = await prisma.progressReport.findUnique({
      where: { id: reportId },
      select: { id: true, createdById: true, unitId: true },
    });
    if (!report) throw new AppError('Informe no encontrado', 404);
    if (this.hasModuleRole(userInfo, ['MOD'])) return report;
    const canManageUnit = await this.canManageUnitProjects(
      userInfo.id,
      report.unitId
    );
    if (canManageUnit) return report;
    this.assertModuleRole(userInfo, ['MEMBER', 'USER']);
    if (report.createdById !== userInfo.id)
      throw new AppError('Solo puede editar sus propios informes', 403);
    return report;
  }

  public static async assertCanReadReport(
    userInfo: UserType,
    reportId: string
  ) {
    const report = await prisma.progressReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        createdById: true,
        presenterUserId: true,
        unitId: true,
        participants: {
          where: { userId: userInfo.id },
          select: { id: true },
        },
      },
    });
    if (!report) throw new AppError('Informe no encontrado', 404);
    if (this.hasModuleRole(userInfo, ['MOD'])) return report;
    this.assertModuleRole(userInfo, ['MEMBER', 'USER', 'VIEWER']);
    const isMember = await this.isUnitMember(userInfo.id, report.unitId);
    if (
      !isMember &&
      report.createdById !== userInfo.id &&
      report.presenterUserId !== userInfo.id &&
      !report.participants.length
    )
      throw new AppError('No puede ver este informe', 403);
    return report;
  }

  public static assertCanCreateCommitment(userInfo: UserType) {
    this.assertModuleRole(userInfo, ['MOD']);
  }

  public static async assertCanManageUnitWork(
    userInfo: UserType,
    unitId?: string
  ) {
    if (this.hasModuleRole(userInfo, ['MOD'])) return;
    if (!unitId) throw new AppError('No tiene permisos para esta accion', 403);
    await this.assertCanManageUnitProjects(userInfo, unitId);
  }

  public static async assertCanProposeInUnit(
    userInfo: UserType,
    unitId: string
  ) {
    if (this.hasModuleRole(userInfo, ['MOD'])) return;
    this.assertModuleRole(userInfo, ['MEMBER', 'USER']);
    const isMember = await this.isUnitMember(userInfo.id, unitId);
    if (!isMember)
      throw new AppError('No pertenece a esta unidad organizacional', 403);
  }

  public static async assertCanUpdateCommitmentStatus(
    userInfo: UserType,
    commitmentId: string
  ) {
    if (this.hasModuleRole(userInfo, ['MOD'])) return;
    this.assertModuleRole(userInfo, ['MEMBER', 'USER']);
    const assignee = await prisma.commitmentAssignee.findFirst({
      where: { commitmentId, userId: userInfo.id },
      select: { id: true },
    });
    if (!assignee)
      throw new AppError('No esta asignado a este compromiso', 403);
  }
}

export default MeetingPermissionService;
