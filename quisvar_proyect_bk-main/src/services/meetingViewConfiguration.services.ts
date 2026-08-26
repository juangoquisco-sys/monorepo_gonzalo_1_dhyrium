import { UserType } from '../middlewares/auth.middleware';
import AppError from '../utils/appError';
import {
  MeetingScope,
  MeetingWorkspaceView,
  prisma,
} from '../utils/prisma.server';
import MeetingPermissionService from './meetingPermission.services';

const ALL_VIEWS = [
  MeetingWorkspaceView.UNITS,
  MeetingWorkspaceView.TECHNICAL_TREE,
  MeetingWorkspaceView.MEMBERS,
  MeetingWorkspaceView.PROJECTS_MEMBERS,
];

type ConfigInput = {
  defaultScope?: MeetingScope | string;
  defaultView?: MeetingWorkspaceView | string;
  visibleViews?: (MeetingWorkspaceView | string)[];
};

type LocalMeetingViewConfig = {
  defaultScope: MeetingScope;
  defaultView: MeetingWorkspaceView;
  visibleViews: MeetingWorkspaceView[];
};

export type MeetingPresentation = {
  scope: MeetingScope;
  defaultView: MeetingWorkspaceView;
  visibleViews: MeetingWorkspaceView[];
};

class MeetingViewConfigurationServices {
  public static readonly defaultPresentation: MeetingPresentation = {
    scope: MeetingScope.SELF,
    defaultView: MeetingWorkspaceView.UNITS,
    visibleViews: ALL_VIEWS,
  };

  public static async resolveForUnit(unitId: string): Promise<
    MeetingPresentation & {
      sourceUnit: { id: string; name: string } | null;
      inherited: boolean;
    }
  > {
    let currentUnitId: string | null = unitId;
    let isFirstUnit = true;

    while (currentUnitId) {
      const unit: {
        id: string;
        name: string;
        parentId: string | null;
        meetingViewConfig: LocalMeetingViewConfig | null;
      } | null = await prisma.organizationalUnit.findUnique({
        where: { id: currentUnitId },
        select: {
          id: true,
          name: true,
          parentId: true,
          meetingViewConfig: {
            select: {
              defaultScope: true,
              defaultView: true,
              visibleViews: true,
            },
          },
        },
      });
      if (!unit) {
        if (isFirstUnit)
          throw new AppError('Unidad organizacional no encontrada', 404);
        break;
      }
      if (unit.meetingViewConfig) {
        return {
          scope: unit.meetingViewConfig.defaultScope,
          defaultView: unit.meetingViewConfig.defaultView,
          visibleViews: unit.meetingViewConfig.visibleViews,
          sourceUnit: { id: unit.id, name: unit.name },
          inherited: !isFirstUnit,
        };
      }
      currentUnitId = unit.parentId;
      isFirstUnit = false;
    }

    return {
      ...this.defaultPresentation,
      visibleViews: [...this.defaultPresentation.visibleViews],
      sourceUnit: null,
      inherited: true,
    };
  }

  public static async get(userInfo: UserType, unitId: string) {
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    const [resolved, localConfig] = await Promise.all([
      this.resolveForUnit(unitId),
      prisma.organizationalUnitMeetingViewConfig.findUnique({
        where: { unitId },
        select: {
          id: true,
          defaultScope: true,
          defaultView: true,
          visibleViews: true,
        },
      }),
    ]);
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        unitId
      ));
    return { ...resolved, localConfig, canManage };
  }

  public static async upsert(
    userInfo: UserType,
    unitId: string,
    input: ConfigInput
  ) {
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    const presentation = this.normalize(input);
    const config = await prisma.organizationalUnitMeetingViewConfig.upsert({
      where: { unitId },
      create: { unitId, ...presentation },
      update: presentation,
      select: {
        id: true,
        unitId: true,
        defaultScope: true,
        defaultView: true,
        visibleViews: true,
        updatedAt: true,
      },
    });
    return { ...(await this.get(userInfo, unitId)), localConfig: config };
  }

  public static async remove(userInfo: UserType, unitId: string) {
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
    await prisma.organizationalUnitMeetingViewConfig.deleteMany({
      where: { unitId },
    });
    return this.get(userInfo, unitId);
  }

  public static normalize(input: ConfigInput): MeetingPresentation {
    const scope = input.defaultScope as MeetingScope;
    if (!Object.values(MeetingScope).includes(scope))
      throw new AppError('Alcance predeterminado invalido', 400);

    const rawViews = Array.isArray(input.visibleViews)
      ? input.visibleViews
      : [];
    const visibleViews = Array.from(
      new Set(rawViews)
    ) as MeetingWorkspaceView[];
    if (!visibleViews.length)
      throw new AppError('Seleccione al menos una vista de reunion', 400);
    if (visibleViews.some(view => !ALL_VIEWS.includes(view)))
      throw new AppError('Vista de reunion invalida', 400);

    const defaultView = input.defaultView as MeetingWorkspaceView;
    if (!visibleViews.includes(defaultView))
      throw new AppError('La vista predeterminada debe estar habilitada', 400);

    return { scope, defaultView, visibleViews };
  }
}

export default MeetingViewConfigurationServices;
