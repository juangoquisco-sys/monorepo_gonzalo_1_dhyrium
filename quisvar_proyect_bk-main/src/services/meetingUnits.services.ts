import { UserType } from '@/middlewares/auth.middleware';
import type {
  CommitmentPriority,
  CommitmentReviewDecision,
  CommitmentStatus,
  CommitmentTargetType,
  FeedbackType,
  OrgUnitProjectFocusStatus,
  Prisma,
  SubTasks,
  TaskRole,
  Files,
} from '@prisma/client';
import {
  OrganizationalMembershipRole,
  StageVersionSourceKind,
  StageVersionType,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import MeetingPermissionService from '@/services/meetingPermission.services';
import {
  assertNextTechnicalReviewPercentage,
  resolveTechnicalReviewSubmissionState,
} from '@/services/technicalReviewSubmissions.policy';
import {
  BASIC_RESOURCE_MANAGER_UNIT_ID,
  isBasicResourceManager,
} from '@/modules/basic-resources/basicResources.policy';
import StageServices from '@/services/stages.services';
import FeedbackServices from '@/services/feedbacks.services';
import CommitmentsServices from '@/services/commitments.services';
import PathServices from '@/services/paths.services';
import ProfileServices from '@/services/profile.services';
import SubTasksServices from '@/services/subtasks.services';
import DuplicatesServices from '@/services/duplicates.services';
import {
  resolveOfficialOrganizationalDirectory,
  resolveLegacyCanonicalDirectoryKey,
} from '@/services/orgDirectory.domain';
import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

const UNIT_SELECT = {
  id: true,
  name: true,
  type: true,
  codemap: true,
  parentId: true,
  isActive: true,
  legacyMap: true,
};

const DIRECTORY_UNIT_SELECT = {
  ...UNIT_SELECT,
  memberships: {
    where: {
      endDate: null,
    },
    select: { id: true },
  },
} satisfies Prisma.OrganizationalUnitSelect;

const orgUnitTypeRank: Record<string, number> = {
  GERENCIA: 0,
  OFICINA: 1,
};

const compareOrgUnits = (
  first: { type: string; name: string },
  second: { type: string; name: string }
) => {
  const firstRank = orgUnitTypeRank[first.type] ?? 2;
  const secondRank = orgUnitTypeRank[second.type] ?? 2;
  if (firstRank !== secondRank) return firstRank - secondRank;
  return first.name.localeCompare(second.name, 'es');
};

const MEMBER_USER_SELECT = {
  id: true,
  email: true,
  status: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      hierarchy: true,
    },
  },
  profile: {
    select: {
      firstName: true,
      lastName: true,
      dni: true,
      job: true,
    },
  },
};

const STAGE_VERSION_SELECT = {
  id: true,
  groupId: true,
  stageId: true,
  versionNumber: true,
  versionLabel: true,
  sourceKind: true,
  sourceProjectId: true,
  sourceStageId: true,
  status: true,
  isCurrent: true,
  notes: true,
  group: {
    select: {
      id: true,
      baseName: true,
      stageType: true,
      projectId: true,
    },
  },
  sourceProject: {
    select: {
      id: true,
      name: true,
      contract: {
        select: {
          cui: true,
          projectName: true,
          projectShortName: true,
        },
      },
    },
  },
  sourceStage: {
    select: {
      id: true,
      name: true,
      projectId: true,
    },
  },
} satisfies Prisma.StageVersionSelect;

const STAGE_WITH_VERSION_SELECT = {
  id: true,
  name: true,
  status: true,
  groupId: true,
  versionMetadata: {
    select: STAGE_VERSION_SELECT,
  },
} satisfies Prisma.StagesSelect;

const MEMBERSHIP_ROLES = Object.values(OrganizationalMembershipRole);
const STAGE_VERSION_TYPES = Object.values(StageVersionType);
const STAGE_VERSION_SOURCE_KINDS = Object.values(StageVersionSourceKind);
const CLOSED_TASK_STATUSES: TaskRole[] = ['DONE', 'LIQUIDATION'];
const REOPENABLE_TASK_STATUSES: TaskRole[] = ['INREVIEW', 'REVIEWED', 'DENIED'];

type TechnicalAssignmentMode =
  | 'UNRESOLVED_ONLY'
  | 'OVERWRITE_ASSIGNED'
  | 'REOPEN_AND_REASSIGN'
  | 'CREATE_ONLY';

type TechnicalCommitmentInput = {
  projectId?: number;
  stageId?: number;
  meetingId?: string | null;
  levelIds?: number[];
  subTaskIds?: number[];
  title?: string;
  description?: string | null;
  dueDate?: string | Date | null;
  priority?: CommitmentPriority;
  status?: CommitmentStatus;
  assigneeUserIds?: number[];
  technicalOwnerId?: number;
  reflectAssignment?: boolean;
  assignmentMode?: TechnicalAssignmentMode;
};

type StageVersionSourceInput = {
  search?: string;
  type?: StageVersionType;
};

type CreateStageVersionInput = {
  name?: string;
  versionLabel?: string;
  sourceStageId?: number;
  sourceProjectId?: number;
  sourceKind?: StageVersionSourceKind;
  linkToCurrentOffice?: boolean;
  copyPolicy?: 'STRUCTURE_AND_MODEL';
};

type PreviewTaskCategory =
  | 'ASSIGNABLE'
  | 'SAME_ASSIGNEE'
  | 'ASSIGNED_TO_OTHER'
  | 'REOPENABLE'
  | 'LOCKED'
  | 'NO_ACTION';

type TechnicalPreviewRow = {
  id: number;
  item: string | null;
  name: string;
  status: TaskRole;
  days: number;
  price: Prisma.Decimal;
  levelId: number;
  category: PreviewTaskCategory;
  action: 'ASSIGN' | 'SKIP' | 'KEEP';
  currentAssignees: {
    id: number;
    userId: number;
    status: boolean;
    statusPayment: boolean;
    assignedAt: Date;
    user: {
      id: number;
      email: string | null;
      profile: {
        firstName: string;
        lastName: string;
        job: string | null;
      } | null;
    };
  }[];
  files: {
    id: number;
    dir: string;
    name: string;
    type: string;
    originalname: string | null;
  }[];
  latestFeedbackFiles: {
    id: number;
    dir: string;
    name: string;
    type: string;
    originalname: string | null;
  }[];
  hasOpenCommitments: boolean;
  openCommitments: { id: string; title: string; status: string }[];
};

type TechnicalStageTreeNode = {
  id?: number;
  subTasks?: {
    id: number;
    users?: unknown[];
    meetingParticipants?: unknown[];
  }[];
  nextLevel?: TechnicalStageTreeNode[];
};

type TechnicalExecutionInput = {
  projectId?: number;
  stageId?: number;
  percentage?: number | string;
  fileType?: Files['type'];
  files?: Express.Multer.File[];
};

type TechnicalTaskReassignInput = {
  projectId?: number;
  stageId?: number;
  newOwnerId?: number;
  reason?: string | null;
  withdrawPendingReview?: boolean;
};

type TechnicalReviewInput = {
  projectId?: number;
  stageId?: number;
  decision?: CommitmentReviewDecision;
  comment?: string | null;
  commitmentId?: string | null;
  contextId?: string | null;
  applyToChildren?: boolean;
};

type TechnicalValuationInput = {
  projectId?: number;
  stageId?: number;
  monthlyPrice?: number | string;
  tasks?: { id?: number; days?: number | string }[];
};

type ProjectFocusInput = {
  projectId?: number;
  stageIds?: number[];
  status?: OrgUnitProjectFocusStatus;
  isCurrent?: boolean;
  notes?: string | null;
};

class MeetingUnitsServices {
  private static ensureStageFolders(projectId: number, stageId: number) {
    (['MODEL', 'REVIEW', 'UPLOADS'] as const).forEach(dir => {
      const stagePath = path.join(
        PathServices.projectPath,
        dir,
        `${projectId}`,
        `${stageId}`
      );
      if (!existsSync(stagePath)) mkdirSync(stagePath, { recursive: true });
    });
  }

  private static removeStageFolders(projectId: number, stageId: number) {
    (['MODEL', 'REVIEW', 'UPLOADS'] as const).forEach(dir => {
      const stagePath = path.join(
        PathServices.projectPath,
        dir,
        `${projectId}`,
        `${stageId}`
      );
      if (existsSync(stagePath))
        rmSync(stagePath, { recursive: true, force: true });
    });
  }

  private static async getReachableUnits() {
    const units = await prisma.organizationalUnit.findMany({
      where: { isActive: true },
      select: UNIT_SELECT,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    const unitsByParent = new Map<string | null, typeof units>();
    units.forEach(unit => {
      const key = unit.parentId ?? null;
      unitsByParent.set(key, [...(unitsByParent.get(key) || []), unit]);
    });

    const reachableUnits: typeof units = [];
    const visit = (parentId: string | null) => {
      [...(unitsByParent.get(parentId) || [])]
        .sort(compareOrgUnits)
        .forEach(unit => {
          reachableUnits.push(unit);
          visit(unit.id);
        });
    };
    visit(null);

    return reachableUnits;
  }

  /**
   * Catálogo visible para selectores y resúmenes. Conserva el árbol heredado
   * para operaciones e historial, pero nunca lo mezcla con el directorio
   * aprobado del organigrama.
   */
  private static async getDirectoryContext() {
    const sourceUnits = await prisma.organizationalUnit.findMany({
      select: DIRECTORY_UNIT_SELECT,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    const directory = resolveOfficialOrganizationalDirectory(
      sourceUnits.map(unit => ({
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
    if (directory.blockers.length)
      throw new AppError(
        `No se puede publicar el directorio oficial: ${directory.blockers.join(
          ' '
        )}`,
        409
      );

    const sourceById = new Map(sourceUnits.map(unit => [unit.id, unit]));
    const idByDirectoryKey = new Map(
      directory.units.map(unit => [unit.definition.directoryKey, unit.unitId])
    );
    const units = directory.units.map((item, directoryOrder) => {
      if (!item.unitId)
        throw new AppError('La unidad oficial no pudo resolverse', 409);
      const source = sourceById.get(item.unitId);
      if (!source)
        throw new AppError('La unidad oficial no existe en el directorio', 409);
      const parentId = item.definition.parentDirectoryKey
        ? idByDirectoryKey.get(item.definition.parentDirectoryKey)
        : null;
      if (item.definition.parentDirectoryKey && !parentId)
        throw new AppError('El padre oficial no pudo resolverse', 409);
      const { memberships: _memberships, ...unit } = source;
      return {
        ...unit,
        name: item.definition.name,
        codemap: item.definition.displayCode,
        parentId: parentId ?? null,
        directoryKey: item.definition.directoryKey,
        directoryOrder: directoryOrder + 1,
        isDirectoryVisible: true,
      };
    });

    const unitIdByDirectoryKey = new Map(
      directory.units.map(item => [item.definition.directoryKey, item.unitId])
    );
    const canonicalUnitIdBySourceUnitId = new Map<string, string>();
    sourceUnits.forEach(source => {
      const directoryKey = resolveLegacyCanonicalDirectoryKey(source);
      const canonicalUnitId = directoryKey
        ? unitIdByDirectoryKey.get(directoryKey)
        : undefined;
      if (canonicalUnitId) {
        canonicalUnitIdBySourceUnitId.set(source.id, canonicalUnitId);
      }
    });
    units.forEach(unit => canonicalUnitIdBySourceUnitId.set(unit.id, unit.id));

    return { units, canonicalUnitIdBySourceUnitId };
  }

  private static async getReachableUnitIds() {
    const units = await this.getReachableUnits();
    return new Set(units.map(unit => unit.id));
  }

  private static getDescendantUnitIds(
    units: Awaited<ReturnType<typeof MeetingUnitsServices.getReachableUnits>>,
    rootUnitId: string
  ) {
    const unitsByParent = new Map<string | null, typeof units>();
    units.forEach(unit => {
      const key = unit.parentId ?? null;
      unitsByParent.set(key, [...(unitsByParent.get(key) || []), unit]);
    });

    const unitIds = new Set<string>([rootUnitId]);
    const visit = (parentId: string) => {
      (unitsByParent.get(parentId) || []).forEach(unit => {
        unitIds.add(unit.id);
        visit(unit.id);
      });
    };
    visit(rootUnitId);

    return Array.from(unitIds);
  }

  private static async assertActiveOrgUnit(unitId: string) {
    const unitIds = await this.getReachableUnitIds();
    if (!unitIds.has(unitId))
      throw new AppError(
        'La unidad no pertenece a las unidades activas del organigrama',
        404
      );
  }

  private static async getVisibleDirectory(userInfo: UserType) {
    const directory = await this.getDirectoryContext();
    const reachableUnits = directory.units;
    if (MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])) {
      return { ...directory, units: reachableUnits };
    }

    const memberships = await prisma.organizationalMembership.findMany({
      where: {
        userId: userInfo.id,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { unitId: true },
      orderBy: [{ isPrimary: 'desc' }, { unit: { name: 'asc' } }],
    });
    const memberUnitIds = new Set(
      memberships
        .map(({ unitId }) => directory.canonicalUnitIdBySourceUnitId.get(unitId))
        .filter((unitId): unitId is string => Boolean(unitId))
    );
    return {
      ...directory,
      units: reachableUnits.filter(unit => memberUnitIds.has(unit.id)),
    };
  }

  private static async getVisibleUnits(userInfo: UserType) {
    return (await this.getVisibleDirectory(userInfo)).units;
  }

  public static async overview(userInfo: UserType) {
    MeetingPermissionService.assertModuleRole(userInfo, [
      'MOD',
      'MEMBER',
      'VIEWER',
      'USER',
    ]);
    const visibleDirectory = await this.getVisibleDirectory(userInfo);
    const units = visibleDirectory.units;
    const visibleUnitIds = new Set(units.map(({ id }) => id));
    const sourceUnitIds = Array.from(
      visibleDirectory.canonicalUnitIdBySourceUnitId.entries()
    )
      .filter(([, canonicalUnitId]) => visibleUnitIds.has(canonicalUnitId))
      .map(([sourceUnitId]) => sourceUnitId);
    const [activeProjects, openCommitments, overdueCommitments, meetings] =
      await Promise.all([
        prisma.orgUnitProjectFocus.groupBy({
          by: ['unitId'],
          where: {
            unitId: { in: sourceUnitIds },
            isCurrent: true,
            status: 'ACTIVE',
          },
          _count: { _all: true },
        }),
        prisma.commitment.groupBy({
          by: ['unitId'],
          where: {
            unitId: { in: sourceUnitIds },
            status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
          },
          _count: { _all: true },
        }),
        prisma.commitment.groupBy({
          by: ['unitId'],
          where: {
            unitId: { in: sourceUnitIds },
            dueDate: { lt: new Date() },
            status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
          },
          _count: { _all: true },
        }),
        prisma.meeting.findMany({
          where: {
            unitId: { in: sourceUnitIds },
            status: { in: ['DRAFT', 'SCHEDULED', 'LIVE'] },
          },
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            status: true,
            unitId: true,
          },
          orderBy: { scheduledAt: 'asc' },
        }),
      ]);

    const countByCanonicalUnit = (
      rows: { unitId: string; _count: { _all: number } }[]
    ) =>
      rows.reduce((counts, row) => {
        const canonicalUnitId =
          visibleDirectory.canonicalUnitIdBySourceUnitId.get(row.unitId);
        if (!canonicalUnitId || !visibleUnitIds.has(canonicalUnitId)) return counts;
        counts.set(
          canonicalUnitId,
          (counts.get(canonicalUnitId) || 0) + row._count._all
        );
        return counts;
      }, new Map<string, number>());

    const activeProjectsMap = countByCanonicalUnit(activeProjects);
    const openCommitmentsMap = countByCanonicalUnit(openCommitments);
    const overdueCommitmentsMap = countByCanonicalUnit(overdueCommitments);
    const nextMeetingByCanonicalUnitId = new Map<string, (typeof meetings)[number]>();
    meetings.forEach(meeting => {
      const canonicalUnitId =
        visibleDirectory.canonicalUnitIdBySourceUnitId.get(meeting.unitId);
      if (!canonicalUnitId || nextMeetingByCanonicalUnitId.has(canonicalUnitId))
        return;
      nextMeetingByCanonicalUnitId.set(canonicalUnitId, meeting);
    });

    const data = units.map(unit => {
      const sourceMeeting = nextMeetingByCanonicalUnitId.get(unit.id);
      const nextMeeting = sourceMeeting
        ? { ...sourceMeeting, unitId: unit.id }
        : undefined;
      const overdue = overdueCommitmentsMap.get(unit.id) || 0;
      const open = openCommitmentsMap.get(unit.id) || 0;
      return {
        ...unit,
        metrics: {
          activeProjects: activeProjectsMap.get(unit.id) || 0,
          openCommitments: open,
          overdueCommitments: overdue,
          nextMeeting,
          health: overdue ? 'CRITICAL' : open ? 'WATCH' : 'HEALTHY',
        },
      };
    });

    return {
      totals: {
        units: data.length,
        activeProjects: data.reduce(
          (acc, unit) => acc + unit.metrics.activeProjects,
          0
        ),
        openCommitments: data.reduce(
          (acc, unit) => acc + unit.metrics.openCommitments,
          0
        ),
        overdueCommitments: data.reduce(
          (acc, unit) => acc + unit.metrics.overdueCommitments,
          0
        ),
        upcomingMeetings: meetings.length,
      },
      data,
    };
  }

  public static async dashboard(userInfo: UserType, unitId: string) {
    await this.assertActiveOrgUnit(unitId);
    const { sourceUnitIds } =
      await MeetingPermissionService.resolveReadableUnitScope(userInfo, unitId);
    const [unit, projects, memberships, commitments, meetings, reports] =
      await Promise.all([
        prisma.organizationalUnit.findUnique({
          where: { id: unitId },
          select: UNIT_SELECT,
        }),
        this.projects(userInfo, unitId),
        prisma.organizationalMembership.findMany({
          where: {
            unitId: { in: sourceUnitIds },
            user: { status: true },
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { firstName: true, lastName: true, job: true },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
        }),
        prisma.commitment.findMany({
          where: {
            unitId: { in: sourceUnitIds },
            status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                contract: { select: { cui: true } },
              },
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    profile: { select: { firstName: true, lastName: true } },
                  },
                },
                unit: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          take: 10,
        }),
        prisma.meeting.findMany({
          where: { unitId: { in: sourceUnitIds } },
          include: {
            projects: {
              include: { project: { select: { id: true, name: true } } },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        }),
        prisma.progressReport.findMany({
          where: { unitId: { in: sourceUnitIds } },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
      ]);
    return {
      unit: unit ? { ...unit, memberships } : unit,
      projects,
      commitments,
      meetings,
      reports,
    };
  }

  public static async projects(userInfo: UserType, unitId: string) {
    await this.assertActiveOrgUnit(unitId);
    const { sourceUnitIds } =
      await MeetingPermissionService.resolveReadableUnitScope(userInfo, unitId);
    const focus = await prisma.orgUnitProjectFocus.findMany({
      where: { unitId: { in: sourceUnitIds }, isCurrent: true },
      include: {
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
                milestones: {
                  orderBy: { dueDate: 'asc' },
                  take: 5,
                },
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    return focus;
  }

  public static async technicalProjects(
    userInfo: UserType,
    unitId: string,
    scope?: string,
    includeInactive = false
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    const normalizedScope = scope === 'descendants' ? 'descendants' : 'self';
    if (
      normalizedScope === 'descendants' &&
      !MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])
    )
      await MeetingPermissionService.assertCanManageUnitProjects(
        userInfo,
        unitId
      );

    const canManageBasicResources = await isBasicResourceManager(userInfo);
    const canBrowseBasicResources =
      canManageBasicResources && unitId === BASIC_RESOURCE_MANAGER_UNIT_ID;
    const unitIds =
      normalizedScope === 'descendants'
        ? this.getDescendantUnitIds(await this.getReachableUnits(), unitId)
        : [unitId];

    return prisma.orgUnitProjectFocus.findMany({
      where: {
        ...(canBrowseBasicResources ? {} : { unitId: { in: unitIds } }),
        isCurrent: true,
        ...(includeInactive ? {} : { status: { not: 'INACTIVE' as const } }),
      },
      include: {
        unit: { select: UNIT_SELECT },
        stageFocus: {
          where: {
            ...(includeInactive
              ? {}
              : {
                  status: { not: 'INACTIVE' as const },
                  isCurrent: true,
                }),
          },
          include: {
            unit: { select: UNIT_SELECT },
            stage: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
          orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        },
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
                milestones: {
                  orderBy: { dueDate: 'asc' },
                  take: 5,
                },
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  public static async technicalProjectStageTree(
    userInfo: UserType,
    unitId: string,
    projectId: number,
    stageId: number,
    status?: SubTasks['status']
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    const [focus, stage, stageFocus] = await Promise.all([
      prisma.orgUnitProjectFocus.findFirst({
        where: {
          unitId,
          projectId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      }),
      prisma.stages.findFirst({
        where: { id: stageId, projectId },
        select: { id: true },
      }),
      prisma.orgUnitProjectStageFocus.findFirst({
        where: {
          unitId,
          projectId,
          stageId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      }),
    ]);
    if (!focus)
      throw new AppError('El proyecto no esta vinculado a esta oficina', 404);
    if (!stage)
      throw new AppError('La etapa no pertenece al proyecto indicado', 404);
    if (!stageFocus)
      throw new AppError('La etapa no esta asignada a esta oficina', 404);

    const tree = await StageServices.find(stageId, status);
    await this.hydrateTechnicalActiveAssignees(tree as TechnicalStageTreeNode);
    await this.hydrateTechnicalMeetingParticipants(
      tree as TechnicalStageTreeNode
    );
    return tree;
  }

  private static collectTreeTaskIds(
    node?: TechnicalStageTreeNode | null,
    taskIds = new Set<number>()
  ) {
    node?.subTasks?.forEach(task => taskIds.add(task.id));
    node?.nextLevel?.forEach(child => this.collectTreeTaskIds(child, taskIds));
    return taskIds;
  }

  private static applyTreeTaskAssignees(
    node: TechnicalStageTreeNode | null | undefined,
    assigneesByTask: Map<number, unknown[]>
  ) {
    node?.subTasks?.forEach(task => {
      task.users = assigneesByTask.get(task.id) || [];
    });
    node?.nextLevel?.forEach(child =>
      this.applyTreeTaskAssignees(child, assigneesByTask)
    );
  }

  private static async hydrateTechnicalActiveAssignees(
    tree: TechnicalStageTreeNode
  ) {
    const taskIds = Array.from(this.collectTreeTaskIds(tree));
    if (!taskIds.length) return;
    const activeAssignees = await prisma.subTaskOnUsers.findMany({
      where: { taskId: { in: taskIds }, status: true },
      orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        taskId: true,
        userId: true,
        status: true,
        statusPayment: true,
        assignedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                job: true,
              },
            },
          },
        },
      },
    });
    const assigneesByTask = new Map<number, unknown[]>();
    activeAssignees.forEach(assignee => {
      if (!assigneesByTask.has(assignee.taskId)) {
        assigneesByTask.set(assignee.taskId, [assignee]);
      }
    });
    this.applyTreeTaskAssignees(tree, assigneesByTask);
  }

  private static applyTreeTaskMeetingParticipants(
    node: TechnicalStageTreeNode | null | undefined,
    participantsByTask: Map<number, unknown[]>
  ) {
    node?.subTasks?.forEach(task => {
      task.meetingParticipants = participantsByTask.get(task.id) || [];
    });
    node?.nextLevel?.forEach(child =>
      this.applyTreeTaskMeetingParticipants(child, participantsByTask)
    );
  }

  private static async hydrateTechnicalMeetingParticipants(
    tree: TechnicalStageTreeNode
  ) {
    const taskIds = Array.from(this.collectTreeTaskIds(tree));
    if (!taskIds.length) return;

    const assignments = await prisma.subTaskOnUsers.findMany({
      where: { taskId: { in: taskIds } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        taskId: true,
        userId: true,
        status: true,
        percentage: true,
        assignedAt: true,
        finishedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                job: true,
              },
            },
          },
        },
      },
    });

    const participantsByTask = new Map<
      number,
      Map<
        number,
        {
          userId: number;
          percentage: number;
          isPrimary: boolean;
          isActive: boolean;
          assignedAt: Date;
          finishedAt: Date | null;
          user: (typeof assignments)[number]['user'];
        }
      >
    >();

    assignments.forEach(assignment => {
      const taskParticipants =
        participantsByTask.get(assignment.taskId) || new Map();
      const current = taskParticipants.get(assignment.userId);
      taskParticipants.set(assignment.userId, {
        userId: assignment.userId,
        percentage: Math.max(current?.percentage || 0, assignment.percentage),
        isPrimary: Boolean(current?.isPrimary || assignment.status),
        isActive: Boolean(current?.isActive || assignment.status),
        assignedAt: current?.assignedAt || assignment.assignedAt,
        finishedAt: current?.finishedAt || assignment.finishedAt,
        user: current?.user || assignment.user,
      });
      participantsByTask.set(assignment.taskId, taskParticipants);
    });

    const normalizedParticipants = new Map<number, unknown[]>();
    participantsByTask.forEach((participants, taskId) => {
      normalizedParticipants.set(
        taskId,
        Array.from(participants.values()).sort((first, second) => {
          if (first.isPrimary !== second.isPrimary)
            return first.isPrimary ? -1 : 1;
          return first.userId - second.userId;
        })
      );
    });
    this.applyTreeTaskMeetingParticipants(tree, normalizedParticipants);
  }

  private static async assertTechnicalProjectStage(
    userInfo: UserType,
    unitId: string,
    projectId: number,
    stageId: number
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    if (!projectId || !stageId)
      throw new AppError('Seleccione proyecto y etapa', 400);
    const [focus, stage, stageFocus] = await Promise.all([
      prisma.orgUnitProjectFocus.findFirst({
        where: {
          unitId,
          projectId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      }),
      prisma.stages.findFirst({
        where: { id: stageId, projectId },
        select: { id: true },
      }),
      prisma.orgUnitProjectStageFocus.findFirst({
        where: {
          unitId,
          projectId,
          stageId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      }),
    ]);
    if (!focus)
      throw new AppError('El proyecto no esta vinculado a esta oficina', 404);
    if (!stage)
      throw new AppError('La etapa no pertenece al proyecto indicado', 404);
    if (!stageFocus)
      throw new AppError('La etapa no esta asignada a esta oficina', 404);
  }

  private static uniqueNumbers(values?: number[]) {
    return Array.from(
      new Set(
        (values || [])
          .map(value => Number(value))
          .filter(value => Number.isInteger(value) && value > 0)
      )
    );
  }

  private static async resolveTechnicalTasks(
    projectId: number,
    stageId: number,
    levelIds: number[],
    subTaskIds: number[]
  ) {
    if (!levelIds.length && !subTaskIds.length)
      throw new AppError('Seleccione al menos un nivel o subtarea', 400);

    const levelTaskWhere = levelIds.length
      ? {
          Levels: {
            stagesId: stageId,
            stages: { projectId },
            OR: [
              { id: { in: levelIds } },
              { levelList: { hasSome: levelIds } },
            ],
          },
        }
      : undefined;
    const directTaskWhere = subTaskIds.length
      ? {
          id: { in: subTaskIds },
          Levels: { stagesId: stageId, stages: { projectId } },
        }
      : undefined;

    const tasks = await prisma.subTasks.findMany({
      where: {
        OR: [levelTaskWhere, directTaskWhere].filter(
          Boolean
        ) as Prisma.SubTasksWhereInput[],
      },
      select: {
        id: true,
        item: true,
        name: true,
        status: true,
        days: true,
        price: true,
        levels_Id: true,
        files: {
          where: { type: { not: 'REVIEW' } },
          select: {
            id: true,
            dir: true,
            name: true,
            type: true,
            originalname: true,
          },
        },
        feedBacks: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            files: {
              select: {
                id: true,
                dir: true,
                name: true,
                type: true,
                originalname: true,
              },
            },
          },
        },
        users: {
          where: { status: true },
          orderBy: { assignedAt: 'desc' },
          select: {
            id: true,
            userId: true,
            status: true,
            statusPayment: true,
            assignedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    job: true,
                  },
                },
              },
            },
          },
        },
        commitmentContexts: {
          where: {
            commitment: {
              confirmationStatus: { not: 'REJECTED' },
              status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
            },
          },
          select: {
            commitment: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
      orderBy: [{ Levels: { index: 'asc' } }, { index: 'asc' }],
    });

    if (!tasks.length)
      throw new AppError(
        'No se encontraron subtareas validas para la seleccion',
        400
      );
    return tasks;
  }

  private static classifyTechnicalTask(
    task: Awaited<
      ReturnType<typeof MeetingUnitsServices.resolveTechnicalTasks>
    >[number],
    technicalOwnerId?: number,
    reflectAssignment?: boolean
  ): Pick<TechnicalPreviewRow, 'category' | 'action'> {
    if (!reflectAssignment) return { category: 'NO_ACTION', action: 'KEEP' };
    if (CLOSED_TASK_STATUSES.includes(task.status))
      return { category: 'LOCKED', action: 'SKIP' };
    if (REOPENABLE_TASK_STATUSES.includes(task.status))
      return { category: 'REOPENABLE', action: 'SKIP' };
    if (task.users.some(user => user.userId === technicalOwnerId))
      return { category: 'SAME_ASSIGNEE', action: 'KEEP' };
    if (task.users.length)
      return { category: 'ASSIGNED_TO_OTHER', action: 'SKIP' };
    if (task.status === 'UNRESOLVED')
      return { category: 'ASSIGNABLE', action: 'ASSIGN' };
    return { category: 'NO_ACTION', action: 'SKIP' };
  }

  private static buildTechnicalPreview(
    tasks: Awaited<
      ReturnType<typeof MeetingUnitsServices.resolveTechnicalTasks>
    >,
    technicalOwnerId?: number,
    reflectAssignment?: boolean
  ) {
    const rows: TechnicalPreviewRow[] = tasks.map(task => {
      const classification = this.classifyTechnicalTask(
        task,
        technicalOwnerId,
        reflectAssignment
      );
      const openCommitments = task.commitmentContexts.map(
        context => context.commitment
      );
      return {
        id: task.id,
        item: task.item,
        name: task.name,
        status: task.status,
        days: task.days,
        price: task.price,
        levelId: task.levels_Id,
        ...classification,
        currentAssignees: task.users,
        files: task.files,
        latestFeedbackFiles: task.feedBacks[0]?.files ?? [],
        hasOpenCommitments: openCommitments.length > 0,
        openCommitments,
      };
    });

    return {
      summary: {
        total: rows.length,
        assignable: rows.filter(row => row.category === 'ASSIGNABLE').length,
        sameAssignee: rows.filter(row => row.category === 'SAME_ASSIGNEE')
          .length,
        assignedToOther: rows.filter(
          row => row.category === 'ASSIGNED_TO_OTHER'
        ).length,
        reopenable: rows.filter(row => row.category === 'REOPENABLE').length,
        locked: rows.filter(row => row.category === 'LOCKED').length,
        noAction: rows.filter(row => row.category === 'NO_ACTION').length,
        withOpenCommitments: rows.filter(row => row.hasOpenCommitments).length,
      },
      rows,
    };
  }

  public static async previewTechnicalCommitmentAssignment(
    userInfo: UserType,
    unitId: string,
    data: TechnicalCommitmentInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      projectId,
      stageId
    );
    const reflectAssignment = Boolean(data.reflectAssignment);
    if (reflectAssignment && !Number(data.technicalOwnerId))
      throw new AppError('Seleccione responsable tecnico principal', 400);
    const tasks = await this.resolveTechnicalTasks(
      projectId,
      stageId,
      this.uniqueNumbers(data.levelIds),
      this.uniqueNumbers(data.subTaskIds)
    );
    return this.buildTechnicalPreview(
      tasks,
      Number(data.technicalOwnerId) || undefined,
      reflectAssignment
    );
  }

  private static toCommitmentDate(value?: string | Date | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida', 400);
    return date;
  }

  private static async assertLiveMeetingScope(
    meetingId: string | null | undefined,
    unitId: string
  ) {
    if (!meetingId) return;
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { unitId: true, status: true, scope: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    if (meeting.status !== 'LIVE')
      throw new AppError(
        'Solo puede crear compromisos tecnicos en una reunion en vivo',
        409
      );
    const allowedUnits =
      meeting.scope === 'DESCENDANTS'
        ? this.getDescendantUnitIds(
            await this.getReachableUnits(),
            meeting.unitId
          )
        : [meeting.unitId];
    if (!allowedUnits.includes(unitId))
      throw new AppError(
        'La unidad no pertenece al alcance de la reunion',
        400
      );
  }

  public static async createTechnicalCommitment(
    userInfo: UserType,
    unitId: string,
    data: TechnicalCommitmentInput
  ) {
    await MeetingPermissionService.assertCanManageUnitWork(userInfo, unitId);
    await this.assertLiveMeetingScope(data.meetingId, unitId);
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      projectId,
      stageId
    );
    if (!data.title?.trim()) throw new AppError('Ingrese el titulo', 400);

    const levelIds = this.uniqueNumbers(data.levelIds);
    const subTaskIds = this.uniqueNumbers(data.subTaskIds);
    const reflectAssignment = Boolean(data.reflectAssignment);
    const assignmentMode: TechnicalAssignmentMode =
      data.assignmentMode ||
      (reflectAssignment ? 'UNRESOLVED_ONLY' : 'CREATE_ONLY');
    const technicalOwnerId = Number(data.technicalOwnerId) || undefined;
    if (assignmentMode !== 'CREATE_ONLY' && !technicalOwnerId)
      throw new AppError('Seleccione responsable tecnico principal', 400);

    const tasks = await this.resolveTechnicalTasks(
      projectId,
      stageId,
      levelIds,
      subTaskIds
    );
    const preview = this.buildTechnicalPreview(
      tasks,
      technicalOwnerId,
      reflectAssignment
    );
    const assignableTaskIds = preview.rows
      .filter(
        row => assignmentMode !== 'CREATE_ONLY' && row.action === 'ASSIGN'
      )
      .map(row => row.id);
    const reassignmentTaskIds = preview.rows
      .filter(
        row =>
          (assignmentMode === 'OVERWRITE_ASSIGNED' ||
            assignmentMode === 'REOPEN_AND_REASSIGN') &&
          row.category === 'ASSIGNED_TO_OTHER' &&
          !CLOSED_TASK_STATUSES.includes(row.status)
      )
      .map(row => row.id);
    const reopenTaskIds = preview.rows
      .filter(
        row =>
          assignmentMode === 'REOPEN_AND_REASSIGN' &&
          row.category === 'REOPENABLE'
      )
      .map(row => row.id);
    const pendingFeedbackIdsToClose = tasks
      .filter(
        task =>
          reopenTaskIds.includes(task.id) &&
          task.status === 'INREVIEW' &&
          task.feedBacks[0]?.id &&
          task.feedBacks[0].status === false
      )
      .map(task => task.feedBacks[0].id);
    const reassignmentOrReopenTaskIds = [
      ...reassignmentTaskIds,
      ...reopenTaskIds,
    ];
    const reviewer = JSON.stringify(
      ProfileServices.setInformation(userInfo.profile)
    );
    const automaticReopenComment =
      'Envio observado automaticamente por reapertura y reasignacion desde Oficinas/Reuniones.';
    const taskContextIds = Array.from(new Set(tasks.map(task => task.id)));
    const assigneeUserIds = this.uniqueNumbers([
      ...(data.assigneeUserIds || []),
      ...(technicalOwnerId ? [technicalOwnerId] : []),
    ]);
    const contexts = [
      ...levelIds.map(levelId => ({
        targetType: 'LEVEL' as CommitmentTargetType,
        unitId,
        projectId,
        stageId,
        levelId,
        subTaskId: null,
        includeChildren: true,
      })),
      ...taskContextIds.map(subTaskId => ({
        targetType: 'TASK' as CommitmentTargetType,
        unitId,
        projectId,
        stageId,
        levelId: null,
        subTaskId,
        includeChildren: false,
      })),
    ];

    const [commitment] = await prisma.$transaction([
      prisma.commitment.create({
        data: {
          unitId,
          projectId,
          meetingId: data.meetingId || null,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          dueDate: this.toCommitmentDate(data.dueDate),
          status: data.status || 'PENDING',
          priority: data.priority || 'NORMAL',
          confirmationStatus: 'CONFIRMED',
          origin: data.meetingId ? 'MEETING' : 'MANUAL',
          createdById: userInfo.id,
          proposedById: userInfo.id,
          confirmedById: userInfo.id,
          confirmedAt: new Date(),
          assignees: {
            createMany: {
              data: assigneeUserIds.length
                ? assigneeUserIds.map(userId => ({ userId, role: 'OWNER' }))
                : [{ unitId, role: 'OWNER' }],
            },
          },
          contexts: {
            createMany: {
              data: contexts.map((context, index) => ({
                ...context,
                isPrimary: index === 0,
              })),
            },
          },
        },
      }),
      ...assignableTaskIds.flatMap(taskId => [
        prisma.subTasks.update({
          where: { id: taskId },
          data: { status: 'PROCESS' },
        }),
        prisma.subTaskOnUsers.create({
          data: {
            taskId,
            userId: technicalOwnerId!,
            status: true,
          },
        }),
      ]),
      ...reassignmentTaskIds.flatMap(taskId => [
        prisma.subTaskOnUsers.updateMany({
          where: { taskId, status: true },
          data: { status: false },
        }),
        prisma.subTasks.update({
          where: { id: taskId },
          data: { status: 'PROCESS' },
        }),
        prisma.subTaskOnUsers.create({
          data: {
            taskId,
            userId: technicalOwnerId!,
            status: true,
          },
        }),
      ]),
      ...(pendingFeedbackIdsToClose.length
        ? [
            prisma.feedback.updateMany({
              where: { id: { in: pendingFeedbackIdsToClose } },
              data: {
                status: true,
                type: 'REJECTED' as FeedbackType,
                reviewer,
                comment: automaticReopenComment,
              },
            }),
          ]
        : []),
      ...reopenTaskIds.flatMap(taskId => [
        prisma.subTaskOnUsers.updateMany({
          where: { taskId, status: true },
          data: { status: false },
        }),
        prisma.subTasks.update({
          where: { id: taskId },
          data: { status: 'PROCESS' },
        }),
        prisma.subTaskOnUsers.create({
          data: {
            taskId,
            userId: technicalOwnerId!,
            status: true,
          },
        }),
      ]),
    ]);

    const created = await prisma.commitment.findUnique({
      where: { id: commitment.id },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: { firstName: true, lastName: true, job: true },
                },
              },
            },
            unit: {
              select: { id: true, name: true, type: true, codemap: true },
            },
          },
        },
        contexts: true,
      },
    });

    return {
      commitment: created,
      assignment: {
        ...preview.summary,
        assigned: assignableTaskIds.length,
        reassigned: reassignmentTaskIds.length,
        reopened: reopenTaskIds.length,
        locked: preview.summary.locked,
        skipped:
          preview.rows.length -
          assignableTaskIds.length -
          reassignmentOrReopenTaskIds.length,
      },
      preview,
    };
  }

  private static parseExecutionPercentage(value?: number | string) {
    const percentage = Number(value ?? 0);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
      throw new AppError('Ingrese un porcentaje valido entre 0 y 100', 400);
    return percentage;
  }

  private static async getTechnicalExecutionTask(
    userInfo: UserType,
    unitId: string,
    projectId: number,
    stageId: number,
    taskId: number
  ) {
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      projectId,
      stageId
    );
    if (!taskId) throw new AppError('Subtarea invalida', 400);
    const task = await prisma.subTasks.findFirst({
      where: {
        id: taskId,
        Levels: {
          stagesId: stageId,
          stages: { projectId },
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        users: {
          where: {
            OR: [
              { status: true },
              { groupId: { not: null }, statusPayment: false },
            ],
          },
          orderBy: [{ status: 'desc' }, { assignedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            userId: true,
            status: true,
            statusPayment: true,
            groupId: true,
            percentage: true,
          },
        },
      },
    });
    if (!task)
      throw new AppError(
        'La subtarea no pertenece al proyecto/etapa indicado',
        404
      );
    return task;
  }

  private static async resolveExecutionUserOnTask(
    userInfo: UserType,
    unitId: string,
    task: Awaited<
      ReturnType<typeof MeetingUnitsServices.getTechnicalExecutionTask>
    >,
    options: { allowSelfAssignment?: boolean } = {}
  ) {
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        unitId
      ));
    const userAssignment = task.users.find(
      user => user.userId === userInfo.id && user.status
    );
    if (userAssignment)
      return {
        canManage,
        userOnTask: userAssignment,
        createdSelfAssignment: false,
      };

    const activeAssignment = task.users.find(user => user.status);
    if (activeAssignment) {
      if (!canManage)
        throw new AppError(
          'La subtarea ya tiene otro responsable tecnico',
          403
        );
      return {
        canManage,
        userOnTask: activeAssignment,
        createdSelfAssignment: false,
      };
    }

    if (options.allowSelfAssignment) {
      const createdAssignment = await prisma.subTaskOnUsers.create({
        data: {
          taskId: task.id,
          userId: userInfo.id,
          status: true,
          percentage: 0,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          statusPayment: true,
          groupId: true,
          percentage: true,
        },
      });
      return {
        canManage,
        userOnTask: createdAssignment,
        createdSelfAssignment: true,
      };
    }

    if (!canManage && !userAssignment)
      throw new AppError('No tiene permiso para ejecutar esta subtarea', 403);
    throw new AppError('La subtarea no tiene responsable tecnico activo', 400);
  }

  private static assertExecutionWritableStatus(
    status: TaskRole,
    review = false
  ) {
    const readOnlyStatuses: TaskRole[] = ['REVIEWED', 'DONE', 'LIQUIDATION'];
    if (readOnlyStatuses.includes(status))
      throw new AppError('La subtarea ya no permite ejecucion', 400);
    if (review && status === 'INREVIEW')
      throw new AppError('La subtarea ya fue enviada a revision', 400);
  }

  private static async createExecutionFiles(
    userInfo: UserType,
    taskId: number,
    files: Express.Multer.File[],
    type: Files['type']
  ) {
    if (!files.length) return [];
    const dir = await PathServices.subTask(taskId, type);
    const author = JSON.stringify(
      ProfileServices.setInformation(userInfo.profile)
    );
    const data = files.map(({ filename, originalname }) => ({
      dir,
      type,
      subTasksId: taskId,
      name: filename,
      originalname,
      userId: userInfo.id,
      author,
    }));
    return data;
  }

  public static async saveTechnicalExecutionProgress(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalExecutionInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const percentage = this.parseExecutionPercentage(data.percentage);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    this.assertExecutionWritableStatus(task.status);
    const { userOnTask } = await this.resolveExecutionUserOnTask(
      userInfo,
      unitId,
      task
    );
    const fileType: Files['type'] =
      data.fileType === 'MODEL' ? 'MODEL' : 'UPLOADS';
    const fileData = await this.createExecutionFiles(
      userInfo,
      taskId,
      data.files || [],
      fileType
    );
    await prisma.$transaction([
      ...(fileData.length
        ? [
            prisma.files.createMany({
              data: fileData,
            }),
          ]
        : []),
      prisma.subTaskOnUsers.update({
        where: { id: userOnTask.id },
        data: { percentage, updatedAt: new Date() },
      }),
      prisma.subTasks.update({
        where: { id: taskId },
        data: { status: 'PROCESS' },
      }),
    ]);
    return SubTasksServices.find(taskId);
  }

  public static async sendTechnicalExecutionReview(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalExecutionInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const percentage = this.parseExecutionPercentage(data.percentage);
    const files = data.files || [];
    if (percentage <= 0)
      throw new AppError('El porcentaje debe ser mayor a cero', 400);
    if (!files.length)
      throw new AppError('Adjunte al menos un entregable para revision', 400);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    this.assertExecutionWritableStatus(task.status, true);
    const { userOnTask, createdSelfAssignment } =
      await this.resolveExecutionUserOnTask(userInfo, unitId, task, {
        allowSelfAssignment: true,
      });
    const feedbackFiles = await this.createExecutionFiles(
      userInfo,
      taskId,
      files,
      'REVIEW'
    );
    try {
      await FeedbackServices.create(
        {
          subTasksId: taskId,
          percentage,
          userOnTaskId: userOnTask.id,
          files: feedbackFiles,
        },
        userInfo
      );
    } catch (error) {
      if (createdSelfAssignment) {
        await prisma.subTaskOnUsers
          .delete({ where: { id: userOnTask.id } })
          .catch(() => {
            // Keep the original error; cleanup is best-effort.
          });
      }
      throw error;
    }
    return SubTasksServices.find(taskId);
  }

  public static async technicalReviewSubmissions(
    userInfo: UserType,
    unitId: string,
    taskId: number
  ) {
    if (!taskId) throw new AppError('Subtarea invalida', 400);
    const taskContext = await prisma.subTasks.findUnique({
      where: { id: taskId },
      select: {
        Levels: {
          select: {
            stagesId: true,
            stages: { select: { projectId: true } },
          },
        },
      },
    });
    if (!taskContext) throw new AppError('Subtarea no encontrada', 404);
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      taskContext.Levels.stages.projectId,
      taskContext.Levels.stagesId
    );
    const submissions = await prisma.feedback.findMany({
      where: { subTasksId: taskId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        author: true,
        reviewer: true,
        type: true,
        status: true,
        percentage: true,
        createdAt: true,
        updatedAt: true,
        replacedAt: true,
        files: {
          select: {
            id: true,
            dir: true,
            name: true,
            originalname: true,
            type: true,
          },
        },
      },
    });
    return submissions.map(submission => ({
      ...submission,
      state: resolveTechnicalReviewSubmissionState(submission),
    }));
  }

  public static async createTechnicalReviewSubmission(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalExecutionInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const percentage = this.parseExecutionPercentage(data.percentage);
    const files = data.files || [];
    if (!files.length)
      throw new AppError('Adjunte al menos un entregable para revision', 400);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    if (task.status !== 'INREVIEW')
      throw new AppError(
        'Solo puede registrar un nuevo entregable cuando existe un envio pendiente',
        400
      );
    const pendingFeedback = await prisma.feedback.findFirst({
      where: { subTasksId: taskId, status: false, replacedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        percentage: true,
        users: { select: { userId: true } },
      },
    });
    if (!pendingFeedback)
      throw new AppError('No existe un envio pendiente para reemplazar', 400);
    assertNextTechnicalReviewPercentage(percentage, pendingFeedback.percentage);
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        unitId
      ));
    const isAssigned = task.users.some(user => user.userId === userInfo.id);
    const isFeedbackAuthor = pendingFeedback.users.some(
      user => user.userId === userInfo.id
    );
    if (!canManage && !isAssigned && !isFeedbackAuthor)
      throw new AppError(
        'No tiene permiso para registrar un nuevo entregable',
        403
      );
    const feedbackFiles = await this.createExecutionFiles(
      userInfo,
      taskId,
      files,
      'REVIEW'
    );
    const author = JSON.stringify(
      ProfileServices.setInformation(userInfo.profile)
    );
    const replacementTime = new Date();
    await prisma.$transaction(async tx => {
      const replaced = await tx.feedback.updateMany({
        where: {
          id: pendingFeedback.id,
          status: false,
          replacedAt: null,
        },
        data: { replacedAt: replacementTime },
      });
      if (replaced.count !== 1)
        throw new AppError(
          'El envio pendiente cambio. Actualiza la subtarea e intenta nuevamente',
          409
        );
      await tx.feedback.create({
        data: {
          subTasksId: taskId,
          percentage,
          author,
          users: { create: { userId: userInfo.id, userMain: true } },
          files: { createMany: { data: feedbackFiles } },
        },
      });
    });
    return SubTasksServices.find(taskId);
  }

  public static async appendTechnicalReviewFiles(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalExecutionInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const files = data.files || [];
    if (!files.length) throw new AppError('Adjunte al menos un archivo', 400);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    if (task.status !== 'INREVIEW')
      throw new AppError(
        'Solo se pueden agregar archivos a envios pendientes',
        400
      );
    const feedback = await prisma.feedback.findFirst({
      where: { subTasksId: taskId, status: false, replacedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        users: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!feedback)
      throw new AppError('El envio ya fue revisado o no existe', 400);
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        unitId
      ));
    const isAssigned = task.users.some(user => user.userId === userInfo.id);
    const isFeedbackAuthor = feedback.users.some(
      user => user.userId === userInfo.id
    );
    if (!canManage && !isAssigned && !isFeedbackAuthor)
      throw new AppError(
        'No tiene permiso para agregar archivos a este envio',
        403
      );
    const feedbackFiles = await this.createExecutionFiles(
      userInfo,
      taskId,
      files,
      'REVIEW'
    );
    await prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        files: {
          createMany: {
            data: feedbackFiles,
          },
        },
      },
    });
    return SubTasksServices.find(taskId);
  }

  public static async updateTechnicalReviewPercentage(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalExecutionInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const percentage = this.parseExecutionPercentage(data.percentage);
    if (percentage <= 0)
      throw new AppError('El porcentaje debe ser mayor a cero', 400);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    if (task.status !== 'INREVIEW')
      throw new AppError('Solo se puede actualizar un envio pendiente', 400);
    const feedback = await prisma.feedback.findFirst({
      where: { subTasksId: taskId, status: false, replacedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        users: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!feedback)
      throw new AppError('El envio ya fue revisado o no existe', 400);
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        unitId
      ));
    const isAssigned = task.users.some(user => user.userId === userInfo.id);
    const isFeedbackAuthor = feedback.users.some(
      user => user.userId === userInfo.id
    );
    if (!canManage && !isAssigned && !isFeedbackAuthor)
      throw new AppError('No tiene permiso para actualizar este envio', 403);
    const approved = await prisma.subTaskOnUsers.aggregate({
      where: { taskId, statusPayment: true },
      _sum: { percentage: true },
    });
    await prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        percentage: (approved._sum.percentage || 0) + percentage,
      },
    });
    return SubTasksServices.find(taskId);
  }

  public static async reassignTechnicalExecutionTask(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalTaskReassignInput
  ) {
    await MeetingPermissionService.assertCanManageUnitWork(userInfo, unitId);
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const newOwnerId = Number(data.newOwnerId);
    if (!newOwnerId) throw new AppError('Seleccione el nuevo responsable', 400);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    if (CLOSED_TASK_STATUSES.includes(task.status))
      throw new AppError(
        'La subtarea esta cerrada y no puede reasignarse',
        400
      );
    if (task.status === 'INREVIEW' && !data.withdrawPendingReview) {
      throw new AppError(
        'Para reasignar una subtarea en revision debe retirar el envio pendiente',
        400
      );
    }
    if (task.status === 'INREVIEW' && !data.reason?.trim()) {
      throw new AppError('Ingrese el motivo de la reasignacion', 400);
    }

    const newOwner = await prisma.users.findFirst({
      where: { id: newOwnerId, status: true },
      select: { id: true },
    });
    if (!newOwner)
      throw new AppError('El nuevo responsable no esta activo', 404);

    const pendingFeedback =
      task.status === 'INREVIEW'
        ? await prisma.feedback.findFirst({
            where: { subTasksId: taskId, status: false },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
        : null;

    const reviewer = JSON.stringify(
      ProfileServices.setInformation(userInfo.profile)
    );
    const reason = data.reason?.trim();
    const comment = reason
      ? `Envio observado por reasignacion desde Oficinas/Reuniones: ${reason}`
      : 'Reasignacion tecnica desde Oficinas/Reuniones.';

    await prisma.$transaction([
      ...(pendingFeedback
        ? [
            prisma.feedback.update({
              where: { id: pendingFeedback.id },
              data: {
                status: true,
                type: 'REJECTED' as FeedbackType,
                reviewer,
                comment,
                users: {
                  connectOrCreate: {
                    where: {
                      userId_feedbackId: {
                        feedbackId: pendingFeedback.id,
                        userId: userInfo.id,
                      },
                    },
                    create: { userId: userInfo.id },
                  },
                },
              },
            }),
          ]
        : []),
      prisma.subTaskOnUsers.updateMany({
        where: { taskId, status: true },
        data: { status: false },
      }),
      prisma.subTaskOnUsers.create({
        data: {
          taskId,
          userId: newOwnerId,
          status: true,
          percentage: 0,
        },
      }),
      prisma.subTasks.update({
        where: { id: taskId },
        data: { status: 'PROCESS' },
      }),
    ]);

    return SubTasksServices.find(taskId);
  }

  public static async selfAssignTechnicalExecutionTask(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: Pick<TechnicalExecutionInput, 'projectId' | 'stageId'>
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const task = await this.getTechnicalExecutionTask(
      userInfo,
      unitId,
      projectId,
      stageId,
      taskId
    );
    if (task.status !== 'UNRESOLVED')
      throw new AppError(
        'Solo se pueden autoasignar subtareas sin iniciar',
        400
      );
    if (task.users.some(user => user.status))
      throw new AppError('La subtarea ya tiene responsable tecnico', 409);
    const isDirectMember = await MeetingPermissionService.isUnitMember(
      userInfo.id,
      unitId
    );
    const isGlobalModerator = MeetingPermissionService.hasModuleRole(userInfo, [
      'MOD',
    ]);
    if (!isDirectMember && !isGlobalModerator)
      throw new AppError('Debe pertenecer a la unidad para autoasignarse', 403);

    await prisma.$transaction([
      prisma.subTaskOnUsers.create({
        data: {
          taskId,
          userId: userInfo.id,
          status: true,
          percentage: 0,
        },
      }),
      prisma.subTasks.update({
        where: { id: taskId },
        data: { status: 'PROCESS' },
      }),
    ]);

    return SubTasksServices.find(taskId);
  }

  private static assertTechnicalReviewDecision(
    decision?: CommitmentReviewDecision,
    comment?: string | null
  ) {
    if (
      !decision ||
      !['APPROVED', 'REJECTED', 'NOT_APPLICABLE'].includes(decision)
    )
      throw new AppError('Decision de revision invalida', 400);
    if (decision === 'REJECTED' && !comment?.trim())
      throw new AppError('Comentario requerido para rechazar', 400);
    return decision;
  }

  private static async getTechnicalReviewTask(
    projectId: number,
    stageId: number,
    taskId: number
  ) {
    const task = await prisma.subTasks.findFirst({
      where: {
        id: taskId,
        Levels: { stagesId: stageId, stages: { projectId } },
      },
      select: {
        id: true,
        status: true,
        users: {
          orderBy: [{ status: 'desc' }, { assignedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            userId: true,
            status: true,
            statusPayment: true,
            percentage: true,
          },
        },
        feedBacks: {
          where: { replacedAt: null },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            percentage: true,
            type: true,
          },
        },
      },
    });
    if (!task)
      throw new AppError(
        'La subtarea no pertenece al proyecto/etapa indicado',
        404
      );
    return task;
  }

  private static resolveReviewPercentage(
    task: Awaited<
      ReturnType<typeof MeetingUnitsServices.getTechnicalReviewTask>
    >
  ) {
    const paidPercentage = task.users.reduce(
      (total, user) => total + (user.statusPayment ? user.percentage : 0),
      0
    );
    const activeAssignment =
      task.users.find(user => user.status) || task.users[0];
    const feedbackPercentage = task.feedBacks[0]?.percentage || 0;
    const percentage = feedbackPercentage - paidPercentage;
    return Math.max(
      0,
      percentage > 0
        ? percentage
        : activeAssignment?.percentage || feedbackPercentage
    );
  }

  private static async reviewTechnicalFeedback(
    userInfo: UserType,
    task: Awaited<
      ReturnType<typeof MeetingUnitsServices.getTechnicalReviewTask>
    >,
    decision: CommitmentReviewDecision,
    comment?: string | null
  ) {
    if (decision === 'NOT_APPLICABLE') return false;
    const latestFeedback = task.feedBacks[0];
    if (task.status !== 'INREVIEW' || !latestFeedback || latestFeedback.status)
      throw new AppError(
        'La subtarea no tiene entregable pendiente de revision',
        400
      );
    const userOnTask = task.users.find(user => user.status) || task.users[0];
    if (!userOnTask)
      throw new AppError(
        'La subtarea no tiene responsable tecnico activo',
        400
      );
    await FeedbackServices.review(
      {
        id: latestFeedback.id,
        userOnTaskId: userOnTask.id,
        percentage: this.resolveReviewPercentage(task),
        comment: comment?.trim() || null,
        type:
          decision === 'APPROVED'
            ? ('ACCEPTED' as FeedbackType)
            : ('REJECTED' as FeedbackType),
      },
      userInfo
    );
    return true;
  }

  private static async reviewCommitmentContext(
    userInfo: UserType,
    data: TechnicalReviewInput
  ) {
    if (!data.commitmentId) return null;
    return CommitmentsServices.review(userInfo, data.commitmentId, {
      decision: data.decision as CommitmentReviewDecision,
      comment: data.comment,
      contextId: data.contextId,
    });
  }

  public static async reviewTechnicalTask(
    userInfo: UserType,
    unitId: string,
    taskId: number,
    data: TechnicalReviewInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const decision = this.assertTechnicalReviewDecision(
      data.decision,
      data.comment
    );
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      projectId,
      stageId
    );
    await MeetingPermissionService.assertCanManageUnitWork(userInfo, unitId);
    if (decision === 'NOT_APPLICABLE' && !data.commitmentId)
      throw new AppError(
        'No hay compromiso asociado para marcar No aplica',
        400
      );

    const task = await this.getTechnicalReviewTask(projectId, stageId, taskId);
    const reviewedTechnical = await this.reviewTechnicalFeedback(
      userInfo,
      task,
      decision,
      data.comment
    );
    const commitment = await this.reviewCommitmentContext(userInfo, {
      ...data,
      decision,
    });

    return {
      task: await SubTasksServices.find(taskId),
      commitment,
      summary: {
        reviewedTasks: reviewedTechnical ? 1 : 0,
        skippedTasks: reviewedTechnical ? 0 : 1,
        commitmentReviewed: Boolean(commitment),
      },
    };
  }

  private static async getTechnicalReviewLevelTasks(
    projectId: number,
    stageId: number,
    levelId: number
  ) {
    const level = await prisma.levels.findFirst({
      where: { id: levelId, stagesId: stageId, stages: { projectId } },
      select: { id: true },
    });
    if (!level)
      throw new AppError(
        'El nivel no pertenece al proyecto/etapa indicado',
        404
      );
    return prisma.subTasks.findMany({
      where: {
        Levels: {
          stagesId: stageId,
          stages: { projectId },
          OR: [{ id: levelId }, { levelList: { hasSome: [levelId] } }],
        },
      },
      select: {
        id: true,
        status: true,
        users: {
          orderBy: [{ status: 'desc' }, { assignedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            userId: true,
            status: true,
            statusPayment: true,
            percentage: true,
          },
        },
        feedBacks: {
          where: { replacedAt: null },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            percentage: true,
            type: true,
          },
        },
      },
      orderBy: [{ index: 'asc' }, { id: 'asc' }],
    });
  }

  public static async reviewTechnicalLevel(
    userInfo: UserType,
    unitId: string,
    levelId: number,
    data: TechnicalReviewInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const decision = this.assertTechnicalReviewDecision(
      data.decision,
      data.comment
    );
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      projectId,
      stageId
    );
    await MeetingPermissionService.assertCanManageUnitWork(userInfo, unitId);
    if (!data.commitmentId)
      throw new AppError('No hay compromiso asociado al nivel', 400);

    const commitment = await this.reviewCommitmentContext(userInfo, {
      ...data,
      decision,
    });
    let reviewedTasks = 0;
    let skippedTasks = 0;

    if (decision === 'APPROVED' && data.applyToChildren) {
      const tasks = await this.getTechnicalReviewLevelTasks(
        projectId,
        stageId,
        levelId
      );
      for (const task of tasks) {
        const reviewable =
          task.status === 'INREVIEW' &&
          Boolean(task.feedBacks[0]) &&
          !task.feedBacks[0].status;
        if (!reviewable) {
          skippedTasks += 1;
          continue;
        }
        await this.reviewTechnicalFeedback(
          userInfo,
          task,
          decision,
          data.comment
        );
        reviewedTasks += 1;
      }
    }

    return {
      commitment,
      summary: {
        reviewedTasks,
        skippedTasks,
        commitmentReviewed: Boolean(commitment),
      },
    };
  }

  public static async updateTechnicalValuation(
    userInfo: UserType,
    unitId: string,
    data: TechnicalValuationInput
  ) {
    const projectId = Number(data.projectId);
    const stageId = Number(data.stageId);
    const monthlyPrice = Number(data.monthlyPrice);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0)
      throw new AppError('Costo mensual invalido', 400);
    await this.assertTechnicalProjectStage(
      userInfo,
      unitId,
      projectId,
      stageId
    );
    await MeetingPermissionService.assertCanManageUnitWork(userInfo, unitId);

    const tasks = (data.tasks || [])
      .map(task => ({
        id: Number(task.id),
        days: Number(task.days),
        price: 0,
      }))
      .filter(task => Number.isInteger(task.id) && task.id > 0);

    if (!tasks.length)
      throw new AppError(
        'Seleccione al menos una subtarea para valorizar',
        400
      );
    if (tasks.some(task => !Number.isFinite(task.days) || task.days < 0))
      throw new AppError('Los dias deben ser numeros positivos', 400);

    const validTasks = await prisma.subTasks.count({
      where: {
        id: { in: tasks.map(task => task.id) },
        Levels: { stagesId: stageId, stages: { projectId } },
      },
    });
    if (validTasks !== tasks.length)
      throw new AppError('Una o mas subtareas no pertenecen a la etapa', 400);

    await SubTasksServices.updateDays({
      stageId,
      monthlyPrice,
      tasks,
    });
    const tree = await StageServices.find(stageId);
    await this.hydrateTechnicalActiveAssignees(tree as TechnicalStageTreeNode);
    return tree;
  }

  public static async projectFocusAdmin(userInfo: UserType, unitId: string) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    return prisma.orgUnitProjectFocus.findMany({
      where: { unitId },
      include: {
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  public static async projectCandidates(search?: string, unitId?: string) {
    const cleanSearch = search?.trim();
    const projects = await prisma.projects.findMany({
      where: cleanSearch
        ? {
            OR: [
              { name: { contains: cleanSearch, mode: 'insensitive' } },
              {
                contract: {
                  cui: { contains: cleanSearch, mode: 'insensitive' },
                },
              },
              {
                contract: {
                  projectName: { contains: cleanSearch, mode: 'insensitive' },
                },
              },
              {
                contract: {
                  projectShortName: {
                    contains: cleanSearch,
                    mode: 'insensitive',
                  },
                },
              },
              {
                stages: {
                  some: {
                    name: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        contract: {
          select: {
            id: true,
            cui: true,
            projectName: true,
            projectShortName: true,
            municipality: true,
          },
        },
        stages: {
          select: STAGE_WITH_VERSION_SELECT,
          orderBy: { updatedAt: 'desc' },
        },
        projectFocus: {
          where: {
            isCurrent: true,
            status: { not: 'INACTIVE' },
            unit: { isActive: true },
          },
          select: {
            id: true,
            unitId: true,
            status: true,
            unit: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });
    const stageIds = projects.flatMap(project =>
      project.stages.map(stage => stage.id)
    );
    const stageFocus = stageIds.length
      ? await prisma.orgUnitProjectStageFocus.findMany({
          where: {
            stageId: { in: stageIds },
            isCurrent: true,
            status: { not: 'INACTIVE' },
          },
          include: { unit: { select: { id: true, name: true, type: true } } },
        })
      : [];
    const focusByStage = new Map(
      stageFocus.map(focus => [focus.stageId, focus])
    );

    return projects.map(({ projectFocus, ...project }) => ({
      ...project,
      stages: project.stages.map(stage => {
        const focus = focusByStage.get(stage.id);
        const availability = !focus
          ? 'available'
          : focus.unitId === unitId
          ? 'occupiedByCurrentUnit'
          : 'occupiedByOtherUnit';
        return {
          ...stage,
          availability,
          occupiedByUnit:
            focus && focus.unitId !== unitId
              ? {
                  id: focus.unit.id,
                  name: focus.unit.name,
                  type: focus.unit.type,
                }
              : null,
        };
      }),
      linkedUnitFocus: projectFocus[0] ?? null,
    }));
  }

  public static async stageVersionSources(
    userInfo: UserType,
    unitId: string,
    projectId: number,
    input: StageVersionSourceInput = {}
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    const cleanType =
      input.type && STAGE_VERSION_TYPES.includes(input.type)
        ? input.type
        : undefined;
    const candidates = await this.projectCandidates(input.search, unitId);
    return candidates
      .map(project => ({
        ...project,
        isCurrentProject: project.id === projectId,
        stages: project.stages.filter(stage => {
          if (!cleanType) return true;
          return this.inferStageVersionType(stage.name) === cleanType;
        }),
      }))
      .filter(project => project.stages.length > 0);
  }

  public static async createStageVersion(
    userInfo: UserType,
    unitId: string,
    projectId: number,
    baseStageId: number,
    input: CreateStageVersionInput
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    const sourceKind =
      input.sourceKind && STAGE_VERSION_SOURCE_KINDS.includes(input.sourceKind)
        ? input.sourceKind
        : StageVersionSourceKind.SAME_STAGE;
    const baseStage = await prisma.stages.findFirst({
      where: { id: baseStageId, projectId },
      include: {
        versionMetadata: {
          include: { group: true },
        },
      },
    });
    if (!baseStage)
      throw new AppError('La etapa base no pertenece al proyecto', 404);

    const sourceStageId =
      sourceKind === StageVersionSourceKind.EMPTY
        ? null
        : input.sourceStageId || baseStageId;
    const sourceStage = sourceStageId
      ? await prisma.stages.findUnique({
          where: { id: sourceStageId },
          include: { project: { select: { id: true, name: true } } },
        })
      : null;
    if (sourceStageId && !sourceStage)
      throw new AppError('Etapa origen no encontrada', 404);
    if (
      sourceStage &&
      input.sourceProjectId &&
      input.sourceProjectId !== sourceStage.projectId
    )
      throw new AppError(
        'La etapa origen no pertenece al proyecto origen',
        400
      );
    if (
      sourceKind === StageVersionSourceKind.SAME_PROJECT_STAGE &&
      sourceStage?.projectId !== projectId
    )
      throw new AppError(
        'La etapa origen debe pertenecer al mismo proyecto',
        400
      );
    if (
      sourceKind === StageVersionSourceKind.SAME_STAGE &&
      sourceStage?.projectId !== projectId
    )
      throw new AppError(
        'La version anterior debe pertenecer al proyecto',
        400
      );

    const baseVersion = await this.ensureStageVersionMetadata(baseStage);
    const baseName = baseVersion.group.baseName;
    const lastVersion = await prisma.stageVersion.findFirst({
      where: { groupId: baseVersion.groupId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const versionNumber = (lastVersion?.versionNumber || 1) + 1;
    const versionLabel = input.versionLabel?.trim() || `v${versionNumber}`;
    const name = input.name?.trim() || `${baseName} ${versionLabel}`;
    const duplicatedName = await StageServices.duplicate(
      projectId,
      name,
      'ROOT'
    );
    if (duplicatedName)
      throw new AppError(
        'Ya existe una etapa con ese nombre en el proyecto',
        400
      );

    const templateStage = sourceStage || baseStage;
    if (sourceKind !== StageVersionSourceKind.EMPTY && !templateStage.groupId)
      throw new AppError(
        'La etapa origen debe tener un grupo tecnico para copiar su indice',
        400
      );

    let createdStage: { id: number } | null = null;
    try {
      createdStage = await prisma.stages.create({
        data: {
          name,
          projectId,
          status: false,
          isProject: templateStage.isProject,
          moderatorId: templateStage.moderatorId,
          rootTypeItem: templateStage.rootTypeItem,
          bachelorCost: templateStage.bachelorCost,
          professionalCost: templateStage.professionalCost,
          graduateCost: templateStage.graduateCost,
          internCost: templateStage.internCost,
          monthlyPrice: templateStage.monthlyPrice,
          stayPrice: templateStage.stayPrice,
          budget: templateStage.budget,
          groupId: templateStage.groupId,
        },
        select: { id: true },
      });

      this.ensureStageFolders(projectId, createdStage.id);

      if (sourceKind !== StageVersionSourceKind.EMPTY && sourceStage) {
        await DuplicatesServices.copyStageContent(
          sourceStage.id,
          createdStage.id,
          {
            name,
          }
        );
      }

      const version = await prisma.stageVersion.create({
        data: {
          groupId: baseVersion.groupId,
          stageId: createdStage.id,
          versionNumber,
          versionLabel,
          sourceKind,
          sourceProjectId: sourceStage?.projectId,
          sourceStageId: sourceStage?.id,
          status: 'ACTIVE',
          isCurrent: true,
        },
        select: STAGE_VERSION_SELECT,
      });
      await prisma.stageVersion.updateMany({
        where: {
          groupId: baseVersion.groupId,
          id: { not: version.id },
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

      let focus = null;
      if (input.linkToCurrentOffice !== false) {
        focus = await this.linkStageVersionToUnit(
          unitId,
          projectId,
          createdStage.id
        );
      }

      const stage = await prisma.stages.findUnique({
        where: { id: createdStage.id },
        select: STAGE_WITH_VERSION_SELECT,
      });
      return { stage, version, focus };
    } catch (error) {
      if (createdStage) {
        this.removeStageFolders(projectId, createdStage.id);
        await prisma.stages
          .delete({ where: { id: createdStage.id } })
          .catch(() => {
            // Best-effort cleanup. The original error is more useful to the caller.
          });
      }
      throw error;
    }
  }

  public static async markStageVersionCurrent(
    userInfo: UserType,
    unitId: string,
    projectId: number,
    stageId: number
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );

    const stage = await prisma.stages.findFirst({
      where: { id: stageId, projectId },
      include: {
        versionMetadata: {
          include: { group: true },
        },
      },
    });
    if (!stage) throw new AppError('La etapa no pertenece al proyecto', 404);

    // Las etapas existentes antes de incorporar el versionado no tienen
    // StageVersion. Al seleccionarlas como actuales se las registra como v1,
    // igual que cuando se crea una nueva versión desde una etapa legacy.
    const version = await this.ensureStageVersionMetadata(stage);

    await prisma.$transaction([
      prisma.stageVersion.updateMany({
        where: { groupId: version.groupId, isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.stageVersion.update({
        where: { id: version.id },
        data: { isCurrent: true },
      }),
    ]);

    const updatedStage = await prisma.stages.findUnique({
      where: { id: version.stageId },
      select: STAGE_WITH_VERSION_SELECT,
    });

    return { stage: updatedStage };
  }

  private static inferStageVersionType(name?: string | null): StageVersionType {
    const normalized = (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalized.includes('basico')) return StageVersionType.BASICOS;
    if (normalized.includes('especial')) return StageVersionType.ESPECIALIDADES;
    if (normalized.includes('costo') || normalized.includes('presupuesto'))
      return StageVersionType.COSTOS;
    return StageVersionType.OTRO;
  }

  private static cleanStageVersionBaseName(name: string) {
    return name.replace(/\s+v\d+$/i, '').trim() || name;
  }

  private static async ensureStageVersionMetadata(stage: {
    id: number;
    name: string;
    projectId: number;
    versionMetadata?: Prisma.StageVersionGetPayload<{
      include: { group: true };
    }> | null;
  }) {
    if (stage.versionMetadata) return stage.versionMetadata;
    const group = await prisma.stageVersionGroup.create({
      data: {
        projectId: stage.projectId,
        baseName: this.cleanStageVersionBaseName(stage.name),
        stageType: this.inferStageVersionType(stage.name),
      },
    });
    return prisma.stageVersion.create({
      data: {
        groupId: group.id,
        stageId: stage.id,
        versionNumber: 1,
        versionLabel: 'v1',
        sourceKind: StageVersionSourceKind.EMPTY,
        status: 'ACTIVE',
        isCurrent: true,
      },
      include: { group: true },
    });
  }

  private static async linkStageVersionToUnit(
    unitId: string,
    projectId: number,
    stageId: number
  ) {
    const focus = await prisma.orgUnitProjectFocus.upsert({
      where: { unitId_projectId: { unitId, projectId } },
      create: {
        unitId,
        projectId,
        status: 'ACTIVE',
        isCurrent: true,
        endDate: null,
      },
      update: {
        status: 'ACTIVE',
        isCurrent: true,
        endDate: null,
      },
      select: { id: true },
    });
    const activeStageIds = await prisma.orgUnitProjectStageFocus.findMany({
      where: {
        unitId,
        projectId,
        projectFocusId: focus.id,
        isCurrent: true,
        status: { not: 'INACTIVE' },
      },
      select: { stageId: true },
    });
    await this.syncProjectStageFocus(
      unitId,
      projectId,
      focus.id,
      this.uniqueStageIds([
        ...activeStageIds.map(item => item.stageId),
        stageId,
      ]),
      'ACTIVE'
    );
    return prisma.orgUnitProjectStageFocus.findUnique({
      where: { unitId_stageId: { unitId, stageId } },
      include: {
        unit: { select: UNIT_SELECT },
        stage: { select: STAGE_WITH_VERSION_SELECT },
      },
    });
  }

  private static uniqueStageIds(values?: number[]) {
    return this.uniqueNumbers(values);
  }

  private static async assertProjectStages(
    projectId: number,
    stageIds: number[]
  ) {
    if (!stageIds.length) return;
    const count = await prisma.stages.count({
      where: { id: { in: stageIds }, projectId },
    });
    if (count !== stageIds.length)
      throw new AppError('Una o mas etapas no pertenecen al proyecto', 400);
  }

  private static async assertStageFocusAvailability(
    unitId: string,
    stageIds: number[]
  ) {
    if (!stageIds.length) return;
    const occupied = await prisma.orgUnitProjectStageFocus.findMany({
      where: {
        stageId: { in: stageIds },
        unitId: { not: unitId },
        isCurrent: true,
        status: { not: 'INACTIVE' },
      },
      include: {
        unit: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
      },
      take: 1,
    });
    if (occupied.length) {
      const conflict = occupied[0];
      throw new AppError(
        `La etapa "${conflict.stage.name}" ya esta asignada a ${conflict.unit.name}`,
        409
      );
    }
  }

  private static async syncProjectStageFocus(
    unitId: string,
    projectId: number,
    projectFocusId: string,
    stageIds: number[],
    status: OrgUnitProjectFocusStatus,
    notes?: string | null
  ) {
    const now = new Date();
    if (status === 'INACTIVE') {
      await prisma.orgUnitProjectStageFocus.updateMany({
        where: {
          unitId,
          projectId,
          projectFocusId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        data: { status: 'INACTIVE', isCurrent: false, endDate: now },
      });
      return;
    }

    await this.assertProjectStages(projectId, stageIds);
    await this.assertStageFocusAvailability(unitId, stageIds);
    await prisma.orgUnitProjectStageFocus.updateMany({
      where: {
        unitId,
        projectId,
        projectFocusId,
        isCurrent: true,
        status: { not: 'INACTIVE' },
        stageId: { notIn: stageIds },
      },
      data: { status: 'INACTIVE', isCurrent: false, endDate: now },
    });
    await Promise.all(
      stageIds.map(stageId =>
        prisma.orgUnitProjectStageFocus.upsert({
          where: { unitId_stageId: { unitId, stageId } },
          create: {
            unitId,
            projectId,
            stageId,
            projectFocusId,
            status,
            isCurrent: true,
            notes,
            endDate: null,
          },
          update: {
            projectId,
            projectFocusId,
            status,
            isCurrent: true,
            notes,
            endDate: null,
          },
        })
      )
    );
  }

  public static async linkProjectFocus(
    userInfo: UserType,
    unitId: string,
    data: ProjectFocusInput
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    if (!data.projectId) throw new AppError('El proyecto es requerido', 400);

    const stageIds = this.uniqueStageIds(data.stageIds);
    const [unit, project] = await Promise.all([
      prisma.organizationalUnit.findUnique({ where: { id: unitId } }),
      prisma.projects.findUnique({ where: { id: data.projectId } }),
    ]);
    if (!unit) throw new AppError('Unidad organizacional no encontrada', 404);
    if (!project) throw new AppError('Proyecto no encontrado', 404);
    await this.assertProjectStages(data.projectId, stageIds);
    await this.assertStageFocusAvailability(unitId, stageIds);

    const status = data.status || 'ACTIVE';
    const focus = await prisma.orgUnitProjectFocus.upsert({
      where: { unitId_projectId: { unitId, projectId: data.projectId } },
      create: {
        unitId,
        projectId: data.projectId,
        status,
        isCurrent: data.isCurrent ?? true,
        notes: data.notes,
        endDate: status === 'INACTIVE' ? new Date() : null,
      },
      update: {
        status,
        isCurrent: data.isCurrent ?? true,
        notes: data.notes,
        endDate: status === 'INACTIVE' ? new Date() : null,
      },
      include: {
        stageFocus: {
          include: {
            unit: { select: UNIT_SELECT },
            stage: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
      },
    });
    await this.syncProjectStageFocus(
      unitId,
      data.projectId,
      focus.id,
      stageIds,
      status,
      data.notes
    );
    return prisma.orgUnitProjectFocus.findUnique({
      where: { id: focus.id },
      include: {
        stageFocus: {
          where: { isCurrent: true },
          include: {
            unit: { select: UNIT_SELECT },
            stage: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
      },
    });
  }

  public static async updateProjectFocus(
    userInfo: UserType,
    unitId: string,
    focusId: string,
    data: ProjectFocusInput
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    const focus = await prisma.orgUnitProjectFocus.findUnique({
      where: { id: focusId },
      select: { id: true, unitId: true, projectId: true },
    });
    if (!focus || focus.unitId !== unitId)
      throw new AppError('Proyecto de oficina no encontrado', 404);

    const status = data.status;
    const stageIds =
      data.stageIds === undefined
        ? undefined
        : this.uniqueStageIds(data.stageIds);
    if (stageIds) {
      await this.assertProjectStages(focus.projectId, stageIds);
      await this.assertStageFocusAvailability(unitId, stageIds);
    }
    const updated = await prisma.orgUnitProjectFocus.update({
      where: { id: focusId },
      data: {
        status,
        isCurrent: data.isCurrent,
        notes: data.notes,
        endDate:
          status === 'INACTIVE'
            ? new Date()
            : status === 'ACTIVE'
            ? null
            : undefined,
      },
      include: {
        stageFocus: {
          include: {
            unit: { select: UNIT_SELECT },
            stage: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
      },
    });
    if (stageIds !== undefined || status === 'INACTIVE') {
      await this.syncProjectStageFocus(
        unitId,
        focus.projectId,
        focus.id,
        stageIds ?? [],
        status || updated.status,
        data.notes
      );
    }
    return prisma.orgUnitProjectFocus.findUnique({
      where: { id: focusId },
      include: {
        stageFocus: {
          where: { isCurrent: true },
          include: {
            unit: { select: UNIT_SELECT },
            stage: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
        project: {
          include: {
            contract: {
              select: {
                id: true,
                cui: true,
                projectName: true,
                projectShortName: true,
                municipality: true,
              },
            },
            stages: {
              select: STAGE_WITH_VERSION_SELECT,
            },
          },
        },
      },
    });
  }

  public static async unlinkProjectFocus(
    userInfo: UserType,
    unitId: string,
    focusId: string
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    const focus = await prisma.orgUnitProjectFocus.findUnique({
      where: { id: focusId },
      select: { id: true, unitId: true, projectId: true },
    });
    if (!focus || focus.unitId !== unitId)
      throw new AppError('Proyecto de oficina no encontrado', 404);

    const [, deleted] = await prisma.$transaction([
      prisma.orgUnitProjectStageFocus.updateMany({
        where: {
          unitId,
          projectId: focus.projectId,
          projectFocusId: focusId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        data: { status: 'INACTIVE', isCurrent: false, endDate: new Date() },
      }),
      prisma.orgUnitProjectFocus.delete({
        where: { id: focusId },
        select: { id: true, unitId: true, projectId: true },
      }),
    ]);
    return deleted;
  }

  public static async projectModerators(userInfo: UserType, unitId: string) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    const canManageCurrentUnit =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        unitId
      ));

    const memberships = await prisma.organizationalMembership.findMany({
      where: {
        unitId,
        user: { status: true },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        user: {
          select: MEMBER_USER_SELECT,
        },
      },
      orderBy: [
        { isUnitLead: 'desc' },
        { canManageUnitProjects: 'desc' },
        { isPrimary: 'desc' },
        { role: 'asc' },
      ],
    });

    return { canManageCurrentUnit, memberships };
  }

  public static async updateProjectModerator(
    userInfo: UserType,
    unitId: string,
    membershipId: string,
    canManageUnitProjects: boolean
  ) {
    await this.assertActiveOrgUnit(unitId);
    MeetingPermissionService.assertModuleRole(userInfo, ['MOD']);
    const membership = await prisma.organizationalMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, unitId: true },
    });
    if (!membership || membership.unitId !== unitId)
      throw new AppError('Miembro de oficina no encontrado', 404);

    return prisma.organizationalMembership.update({
      where: { id: membershipId },
      data: { canManageUnitProjects },
      include: {
        user: {
          select: MEMBER_USER_SELECT,
        },
      },
    });
  }

  public static async memberCandidates(
    userInfo: UserType,
    unitId: string,
    search?: string
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );

    const activeMemberships = await prisma.organizationalMembership.findMany({
      where: {
        unitId,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { userId: true },
    });
    const assignedUserIds = activeMemberships.map(member => member.userId);
    const cleanSearch = search?.trim();

    return prisma.users.findMany({
      where: {
        status: true,
        id: { notIn: assignedUserIds },
        ...(cleanSearch
          ? {
              OR: [
                { email: { contains: cleanSearch, mode: 'insensitive' } },
                {
                  profile: {
                    firstName: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    lastName: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    dni: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    job: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      select: MEMBER_USER_SELECT,
      orderBy: [{ profile: { firstName: 'asc' } }, { email: 'asc' }],
      take: 25,
    });
  }

  public static async addMember(
    userInfo: UserType,
    unitId: string,
    data: {
      userId?: number;
      role?: OrganizationalMembershipRole;
      isPrimary?: boolean;
      isUnitLead?: boolean;
      canManageUnitProjects?: boolean;
    }
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    const userId = Number(data.userId);
    if (!userId) throw new AppError('Seleccione un usuario', 400);

    const role = data.role || OrganizationalMembershipRole.ESPECIALISTA;
    if (!MEMBERSHIP_ROLES.includes(role))
      throw new AppError('Rol organizacional invalido', 400);

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user || !user.status)
      throw new AppError('Usuario activo no encontrado', 404);

    const activeMembership = await prisma.organizationalMembership.findFirst({
      where: {
        unitId,
        userId,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { id: true },
    });
    if (activeMembership)
      throw new AppError('El usuario ya pertenece a esta oficina', 400);

    const canGrantLocalMod =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) &&
      Boolean(data.canManageUnitProjects);

    const createData = {
      unitId,
      userId,
      role,
      isPrimary: Boolean(data.isPrimary),
      isUnitLead: Boolean(data.isUnitLead),
      canManageUnitProjects: canGrantLocalMod,
      startDate: new Date(),
      endDate: null,
    };

    const include = {
      user: {
        select: MEMBER_USER_SELECT,
      },
    };

    if (!createData.isUnitLead) {
      return prisma.organizationalMembership.create({
        data: createData,
        include,
      });
    }

    const [, created] = await prisma.$transaction([
      prisma.organizationalMembership.updateMany({
        where: {
          unitId,
          isUnitLead: true,
          endDate: null,
        },
        data: { isUnitLead: false },
      }),
      prisma.organizationalMembership.create({
        data: createData,
        include,
      }),
    ]);

    return created;
  }

  public static async addMembersBulk(
    userInfo: UserType,
    unitId: string,
    data: {
      members?: {
        userId?: number;
        role?: OrganizationalMembershipRole;
        isPrimary?: boolean;
        isUnitLead?: boolean;
        canManageUnitProjects?: boolean;
      }[];
    }
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );

    const requestedMembers = Array.isArray(data.members) ? data.members : [];
    if (!requestedMembers.length)
      throw new AppError('Seleccione al menos un miembro', 400);

    const leadCount = requestedMembers.filter(member =>
      Boolean(member.isUnitLead)
    ).length;
    if (leadCount > 1)
      throw new AppError(
        'Solo puede seleccionar un responsable principal',
        400
      );

    const isModuleMod = MeetingPermissionService.hasModuleRole(userInfo, [
      'MOD',
    ]);
    const wantsLocalMod = requestedMembers.some(member =>
      Boolean(member.canManageUnitProjects)
    );
    if (wantsLocalMod && !isModuleMod) {
      throw new AppError(
        'Solo un MOD del modulo puede otorgar permisos de gestor local',
        403
      );
    }

    const normalizedMembers = requestedMembers.map(member => {
      const userId = Number(member.userId);
      if (!userId) throw new AppError('Seleccione usuarios validos', 400);

      const role = member.role || OrganizationalMembershipRole.ESPECIALISTA;
      if (!MEMBERSHIP_ROLES.includes(role))
        throw new AppError('Rol organizacional invalido', 400);

      return {
        userId,
        role,
        isPrimary: Boolean(member.isPrimary),
        isUnitLead: Boolean(member.isUnitLead),
        canManageUnitProjects: Boolean(member.canManageUnitProjects),
      };
    });

    const duplicatedInPayload = new Set<number>();
    const seenUsers = new Set<number>();
    normalizedMembers.forEach(member => {
      if (seenUsers.has(member.userId)) duplicatedInPayload.add(member.userId);
      seenUsers.add(member.userId);
    });

    const userIds = [...seenUsers];
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, status: true },
    });
    const activeUserIds = new Set(
      users.filter(user => Boolean(user.status)).map(user => user.id)
    );

    const existingMemberships = await prisma.organizationalMembership.findMany({
      where: {
        unitId,
        userId: { in: userIds },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { userId: true },
    });
    const existingUserIds = new Set(
      existingMemberships.map(membership => membership.userId)
    );

    const skipped: { userId: number; reason: string }[] = [];
    const creatableMembers = normalizedMembers.filter(member => {
      if (duplicatedInPayload.has(member.userId)) {
        skipped.push({
          userId: member.userId,
          reason: 'Usuario repetido en la seleccion',
        });
        return false;
      }
      if (!activeUserIds.has(member.userId)) {
        skipped.push({
          userId: member.userId,
          reason: 'Usuario activo no encontrado',
        });
        return false;
      }
      if (existingUserIds.has(member.userId)) {
        skipped.push({
          userId: member.userId,
          reason: 'El usuario ya pertenece a esta oficina',
        });
        return false;
      }
      return true;
    });

    const include = {
      user: {
        select: MEMBER_USER_SELECT,
      },
    };

    if (!creatableMembers.length) {
      return {
        created: [],
        skipped,
        unitLeadMembershipId: null,
      };
    }

    const leadUserId =
      creatableMembers.find(member => member.isUnitLead)?.userId ?? null;

    const created = await prisma.$transaction(async tx => {
      if (leadUserId) {
        await tx.organizationalMembership.updateMany({
          where: {
            unitId,
            isUnitLead: true,
            endDate: null,
          },
          data: { isUnitLead: false },
        });
      }

      const results = [];
      for (const member of creatableMembers) {
        const createdMembership = await tx.organizationalMembership.create({
          data: {
            unitId,
            userId: member.userId,
            role: member.role,
            isPrimary: member.isPrimary,
            isUnitLead: member.isUnitLead,
            canManageUnitProjects: member.canManageUnitProjects,
            startDate: new Date(),
            endDate: null,
          },
          include,
        });
        results.push(createdMembership);
      }
      return results;
    });

    return {
      created,
      skipped,
      unitLeadMembershipId:
        created.find(membership => membership.isUnitLead)?.id ?? null,
    };
  }

  public static async updateMember(
    userInfo: UserType,
    unitId: string,
    membershipId: string,
    data: {
      role?: OrganizationalMembershipRole;
      roleId?: number | null;
      isPrimary?: boolean;
      isUnitLead?: boolean;
      canManageUnitProjects?: boolean;
    }
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );

    const membership = await prisma.organizationalMembership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        unitId: true,
        endDate: true,
        canManageUnitProjects: true,
      },
    });
    if (!membership || membership.unitId !== unitId)
      throw new AppError('Miembro de oficina no encontrado', 404);
    if (membership.endDate && membership.endDate < new Date())
      throw new AppError('No se puede editar un miembro retirado', 400);

    const updateData: Prisma.OrganizationalMembershipUpdateInput = {};
    const userUpdateData: Prisma.UsersUpdateInput = {};
    if (data.role !== undefined) {
      if (!MEMBERSHIP_ROLES.includes(data.role))
        throw new AppError('Rol organizacional invalido', 400);
      updateData.role = data.role;
    }
    if (data.roleId !== undefined) {
      const nextRoleId = data.roleId ? Number(data.roleId) : null;
      if (nextRoleId) {
        const role = await prisma.role.findUnique({
          where: { id: nextRoleId },
          select: { id: true },
        });
        if (!role) throw new AppError('Rol global invalido', 400);
      }
      userUpdateData.role = nextRoleId
        ? { connect: { id: nextRoleId } }
        : { disconnect: true };
    }
    if (data.isPrimary !== undefined)
      updateData.isPrimary = Boolean(data.isPrimary);
    if (data.isUnitLead !== undefined)
      updateData.isUnitLead = Boolean(data.isUnitLead);

    if (data.canManageUnitProjects !== undefined) {
      if (!MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])) {
        throw new AppError(
          'Solo un MOD del modulo puede cambiar gestores de oficina',
          403
        );
      }
      updateData.canManageUnitProjects = Boolean(data.canManageUnitProjects);
    }

    const include = {
      user: {
        select: MEMBER_USER_SELECT,
      },
    };

    const shouldUpdateUser = Object.keys(userUpdateData).length > 0;
    const runUpdate = async (tx: typeof prisma) => {
      const updated = await tx.organizationalMembership.update({
        where: { id: membershipId },
        data: updateData,
        include,
      });
      if (shouldUpdateUser) {
        await tx.users.update({
          where: { id: updated.userId },
          data: userUpdateData,
        });
        return tx.organizationalMembership.findUnique({
          where: { id: membershipId },
          include,
        });
      }
      return updated;
    };

    if (data.isUnitLead === true) {
      return prisma.$transaction(async tx => {
        await tx.organizationalMembership.updateMany({
          where: {
            unitId,
            id: { not: membershipId },
            isUnitLead: true,
            endDate: null,
          },
          data: { isUnitLead: false },
        });
        return runUpdate(tx as typeof prisma);
      });
    }

    return prisma.$transaction(async tx => runUpdate(tx as typeof prisma));
  }

  public static async terminateMember(
    userInfo: UserType,
    unitId: string,
    membershipId: string
  ) {
    await this.assertActiveOrgUnit(unitId);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );

    const membership = await prisma.organizationalMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, unitId: true, startDate: true, endDate: true },
    });
    if (!membership || membership.unitId !== unitId)
      throw new AppError('Miembro de oficina no encontrado', 404);
    if (membership.endDate && membership.endDate < new Date())
      return membership;

    return prisma.organizationalMembership.update({
      where: { id: membershipId },
      data: {
        endDate: new Date(),
        isUnitLead: false,
        canManageUnitProjects: false,
      },
      include: {
        user: {
          select: MEMBER_USER_SELECT,
        },
      },
    });
  }

  public static async commitmentBoard(userInfo: UserType) {
    MeetingPermissionService.assertModuleRole(userInfo, [
      'MOD',
      'MEMBER',
      'VIEWER',
      'USER',
    ]);
    const units = await this.getVisibleUnits(userInfo);
    const unitIds = units.map(unit => unit.id);
    const commitments = await prisma.commitment.findMany({
      where: {
        unitId: { in: unitIds },
        confirmationStatus: { not: 'REJECTED' },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            contract: {
              select: { id: true, cui: true, projectShortName: true },
            },
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: { firstName: true, lastName: true, job: true },
                },
              },
            },
            unit: {
              select: { id: true, name: true, type: true, codemap: true },
            },
          },
        },
        contexts: {
          include: {
            unit: {
              select: { id: true, name: true, type: true, codemap: true },
            },
            project: {
              select: {
                id: true,
                name: true,
                contract: {
                  select: { id: true, cui: true, projectShortName: true },
                },
              },
            },
            stage: { select: { id: true, name: true, projectId: true } },
            level: {
              select: {
                id: true,
                name: true,
                item: true,
                index: true,
                level: true,
                stagesId: true,
              },
            },
            subTask: {
              select: {
                id: true,
                name: true,
                item: true,
                index: true,
                status: true,
                levels_Id: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        reviews: {
          orderBy: { reviewedAt: 'desc' },
          take: 1,
          include: {
            reviewedBy: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    const commitmentsByUnit = new Map<string, typeof commitments>();
    commitments.forEach(commitment => {
      commitmentsByUnit.set(commitment.unitId, [
        ...(commitmentsByUnit.get(commitment.unitId) || []),
        commitment,
      ]);
    });

    const nodeMap = new Map<string, any>();
    units.forEach(unit => {
      const unitCommitments = commitmentsByUnit.get(unit.id) || [];
      const now = new Date();
      const metric = {
        total: unitCommitments.length,
        pending: 0,
        inProgress: 0,
        blocked: 0,
        done: 0,
        rejected: 0,
        notApplicable: 0,
        overdue: 0,
      };
      unitCommitments.forEach(commitment => {
        if (commitment.status === 'PENDING') metric.pending += 1;
        if (commitment.status === 'IN_PROGRESS') metric.inProgress += 1;
        if (commitment.status === 'BLOCKED') metric.blocked += 1;
        if (commitment.status === 'DONE') metric.done += 1;
        if (
          commitment.dueDate &&
          commitment.dueDate < now &&
          ['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(commitment.status)
        )
          metric.overdue += 1;
        const lastDecision = commitment.reviews[0]?.decision;
        if (lastDecision === 'REJECTED') metric.rejected += 1;
        if (lastDecision === 'NOT_APPLICABLE') metric.notApplicable += 1;
      });
      nodeMap.set(unit.id, {
        ...unit,
        depth: 0,
        path: [unit.name],
        metrics: metric,
        commitments: unitCommitments,
        children: [],
      });
    });

    const roots: any[] = [];
    units.forEach(unit => {
      const node = nodeMap.get(unit.id);
      const parent = unit.parentId ? nodeMap.get(unit.parentId) : null;
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    const hydrate = (node: any, depth: number, path: string[]) => {
      node.depth = depth;
      node.path = path;
      node.children.forEach((child: any) =>
        hydrate(child, depth + 1, [...path, child.name])
      );
    };
    roots.forEach(root => hydrate(root, 0, [root.name]));
    roots.sort((first, second) => {
      const firstGeneral = first.name
        .toLowerCase()
        .includes('gerencia general');
      const secondGeneral = second.name
        .toLowerCase()
        .includes('gerencia general');
      if (firstGeneral && !secondGeneral) return -1;
      if (!firstGeneral && secondGeneral) return 1;
      return first.name.localeCompare(second.name);
    });

    return { rootMode: 'AUTO_ROOT', units: roots };
  }
}

export default MeetingUnitsServices;
