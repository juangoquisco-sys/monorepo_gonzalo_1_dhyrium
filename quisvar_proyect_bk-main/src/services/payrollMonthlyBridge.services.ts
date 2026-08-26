import { PayMessageStatus, ReportUserType, SubTasks } from '@prisma/client';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
} from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AppError from '@/utils/appError';
import { archiverFolder } from '@/utils/archiver';
import { prisma } from '@/utils/prisma.server';
import Utilities from '@/utils/utilities';
import { numberToConvert } from '@/utils/tools';
import LevelsServices from '@/services/levels.services';
import MeetingPermissionService from '@/services/meetingPermission.services';
import { UserType } from '@/middlewares/auth.middleware';

type BridgeStatus = SubTasks['status'];
type BridgeCandidateStatus = BridgeStatus | 'ALL' | 'PAYABLE';

export interface MonthlyBridgeCandidatesParams {
  uploadStart?: Date;
  uploadEnd?: Date;
  reviewStart?: Date;
  reviewEnd?: Date;
  status?: BridgeCandidateStatus;
  projectId?: number;
  stageId?: number;
}

export interface MonthlyBridgeCreateItem {
  userId: number;
  amount: number;
  discountAmount?: number;
  subTaskOnUserIds: number[];
}

export interface MonthlyBridgeCreatePayload {
  payrollId?: number;
  pad?: number;
  periodStart?: Date;
  periodEnd?: Date;
  officeId?: number;
  items: MonthlyBridgeCreateItem[];
}

export interface MonthlyBridgeDownloadZipPayload {
  subTaskOnUserIds: number[];
}

export interface MonthlyBridgeWorkspaceLinkParams {
  taskId: number;
  preferredUnitId?: string;
  userInfo: UserType;
}

export interface MonthlyBridgePersonnelRequestsParams {
  payrollId: number;
  uploadStart: Date;
  uploadEnd: Date;
}

export interface SelfSubmissionTechnicalTasksParams {
  userInfo: UserType;
  uploadStart?: Date;
  uploadEnd?: Date;
  status?: BridgeCandidateStatus;
  projectId?: number;
  stageId?: number;
}

export interface SelfSubmissionCreatePayload {
  userInfo: UserType;
  amount: number;
  discountAmount?: number;
  subTaskOnUserIds: number[];
}

export interface AdministrativeSubmissionItem {
  userId: number;
  amount: number;
}

export interface AdministrativeSubmissionPayload {
  userInfo?: UserType;
  userId: number;
  amount: number;
  payrollId?: number;
}

export interface AdministrativePersonnelSubmissionPayload {
  payrollId: number;
  items: AdministrativeSubmissionItem[];
}

interface BridgeTaskEvidence {
  id: number;
  subTaskOnUserId: number;
  userId: number;
  name: string;
  item: string;
  status: BridgeStatus;
  percentage: number;
  price: number;
  days: number;
  assignedAt: Date;
  updatedAt: Date;
  reviewedAt: Date;
  parentLevels?: string[];
}

interface BridgeLevelEvidence {
  id: number;
  name: string;
  item: string;
  parentLevels: string[];
  tasks: BridgeTaskEvidence[];
}

interface BridgeStageEvidence {
  id: number;
  name: string;
  projectId: number;
  projectName: string | null;
  cui: string | null;
  levels: BridgeLevelEvidence[];
}

interface BridgeUserOffice {
  id: string;
  name: string;
  type: string;
}

class PayrollMonthlyBridgeServices {
  private static defaultPeriodStart = new Date('2026-05-01T00:00:00.000-05:00');
  private static defaultPeriodEnd = new Date('2026-05-31T23:59:59.999-05:00');
  private static downloadRoot = 'download';
  private static zipPathLengthThreshold = 190;

  public static async candidates({
    uploadStart,
    uploadEnd,
    reviewStart,
    reviewEnd,
    status,
    projectId,
    stageId,
  }: MonthlyBridgeCandidatesParams) {
    const start = uploadStart || reviewStart;
    const end = uploadEnd || reviewEnd;
    if (!start || !end) {
      throw new AppError('Ingrese un rango de subida valido', 400);
    }
    const rows = await this.findCandidateTasks({
      uploadStart: start,
      uploadEnd: end,
      status,
      projectId,
      stageId,
    });
    const users = await this.groupRowsByUsers(rows);
    return {
      totalUsers: users.length,
      totalTasks: rows.length,
      users,
    };
  }

  public static async create({
    payrollId,
    pad,
    periodStart = this.defaultPeriodStart,
    periodEnd = this.defaultPeriodEnd,
    officeId,
    items,
  }: MonthlyBridgeCreatePayload) {
    if (!items?.length) throw new AppError('Seleccione usuarios y tareas', 400);
    if (items.some(item => !item.userId || item.amount <= 0)) {
      throw new AppError('Cada usuario debe tener un monto valido', 400);
    }
    if (items.some(item => !item.subTaskOnUserIds?.length)) {
      throw new AppError('Cada usuario debe tener tareas seleccionadas', 400);
    }

    const result = await prisma.$transaction(async tx => {
      const selectedOffice = officeId
        ? await tx.office.findUnique({
            where: { id: officeId },
            select: { id: true, name: true },
          })
        : null;
      if (officeId && !selectedOffice) {
        throw new AppError('No se encontro la oficina destino', 404);
      }

      const payroll =
        payrollId !== undefined
          ? await tx.payrolls.findUnique({ where: { id: payrollId } })
          : await tx.payrolls.create({
              data: this.buildPayrollData(
                pad || (await this.nextPayrollPad(tx))
              ),
            });
      if (!payroll) throw new AppError('No se encontro la planilla', 404);

      const created: {
        userId: number;
        reportId: number;
        paymessageId: number;
        amount: number;
      }[] = [];

      for (const item of items) {
        const uniqueTaskIds = [...new Set(item.subTaskOnUserIds)];
        const tasks = await tx.subTaskOnUsers.findMany({
          where: {
            id: { in: uniqueTaskIds },
            userId: item.userId,
            statusPayment: false,
            reportId: null,
          },
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: { firstName: true, lastName: true, dni: true },
                },
              },
            },
            task: {
              select: {
                id: true,
                status: true,
                name: true,
                index: true,
                typeItem: true,
              },
            },
          },
        });
        if (tasks.length !== uniqueTaskIds.length) {
          throw new AppError(
            'Algunas tareas ya fueron usadas en otro informe o no pertenecen al usuario',
            409
          );
        }

        const user = tasks[0]?.user;
        if (!user) throw new AppError('No se encontro el usuario', 404);
        const office =
          selectedOffice ||
          (await this.resolveLegacyOfficeForUser(tx, item.userId));
        const report = await tx.reports.create({
          data: {
            ...this.buildReportData({
              amount: item.amount,
              discountAmount: item.discountAmount || 0,
              userId: item.userId,
              officeId: office.id,
              periodStart,
              periodEnd,
            }),
            payrollId: payroll.id,
          },
        });

        await tx.subTaskOnUsers.updateMany({
          where: { id: { in: uniqueTaskIds } },
          data: {
            reportId: report.id,
            percentagePayment: 100,
            statusPayment: true,
            price: 0,
          },
        });
        await tx.subTasks.updateMany({
          where: {
            id: { in: [...new Set(tasks.map(task => task.taskId))] },
            status: { notIn: ['DENIED', 'LIQUIDATION', 'UNRESOLVED'] },
          },
          data: { status: 'REVIEWED' },
        });

        const paymessage = await tx.payMessages.create({
          data: {
            title: `Pago mensual mayo - ${this.fullName(user.profile)}`,
            header: `Informe mensual mayo - ${this.fullName(user.profile)}`,
            description:
              'Tramite temporal creado desde puente urgente de pagos mayo',
            type: 'INFORME',
            office: { connect: { id: office.id } },
            historyOfficesIds: [office.id],
            onHolding: false,
            report: { connect: { id: report.id } },
            users: {
              create: {
                userId: item.userId,
                userInit: true,
                status: true,
              },
            },
            history: {
              create: {
                title: 'Puente pagos mayo',
                header: 'Creacion automatica',
                description: JSON.stringify({
                  office: office.name,
                  subtitle: 'Informe y tramite temporal para planilla legacy',
                  status: true,
                }),
              },
            },
          },
        });

        created.push({
          userId: item.userId,
          reportId: report.id,
          paymessageId: paymessage.id,
          amount: item.amount,
        });
      }

      return { payroll, created };
    });

    return {
      payrollId: result.payroll.id,
      payroll: result.payroll,
      created: result.created,
    };
  }

  public static async downloadZip({
    subTaskOnUserIds,
  }: MonthlyBridgeDownloadZipPayload) {
    if (!subTaskOnUserIds?.length) {
      throw new AppError('Seleccione al menos una tarea', 400);
    }
    const uniqueIds = [...new Set(subTaskOnUserIds.map(Number))].filter(
      Boolean
    );
    if (uniqueIds.length !== subTaskOnUserIds.length) {
      throw new AppError('La seleccion contiene tareas duplicadas', 400);
    }

    const rows = await prisma.subTaskOnUsers.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: { firstName: true, lastName: true, dni: true },
            },
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            index: true,
            typeItem: true,
            files: {
              where: { type: 'UPLOADS' },
              select: {
                id: true,
                name: true,
                originalname: true,
                dir: true,
                type: true,
              },
              orderBy: { assignedAt: 'asc' },
            },
            feedBacks: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                files: {
                  select: {
                    id: true,
                    name: true,
                    originalname: true,
                    dir: true,
                    type: true,
                  },
                  orderBy: { assignedAt: 'asc' },
                },
              },
            },
            Levels: {
              select: {
                id: true,
                levelList: true,
                stages: {
                  select: {
                    id: true,
                    name: true,
                    project: {
                      select: {
                        name: true,
                        contract: { select: { cui: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { task: { Levels: { stagesId: 'asc' } } },
        { user: { profile: { lastName: 'asc' } } },
        { user: { profile: { firstName: 'asc' } } },
        { task: { index: 'asc' } },
      ],
    });
    if (rows.length !== uniqueIds.length) {
      throw new AppError('Algunas tareas seleccionadas no existen', 404);
    }

    const levelIds = rows.reduce<number[]>((acc, row) => {
      acc.push(...row.task.Levels.levelList, row.task.Levels.id);
      return [...new Set(acc)];
    }, []);
    const levels = await LevelsServices.getLevelsByIds(levelIds);
    const uniqueId = uuidv4();
    const sourceDir = path.join(this.downloadRoot, uniqueId);
    const outputFilePath = `${sourceDir}.zip`;
    const missingLogPath = path.join(sourceDir, '_archivos_no_encontrados.txt');
    const shortenedLogPath = path.join(sourceDir, '_rutas_abreviadas.txt');
    if (!existsSync(sourceDir)) mkdirSync(sourceDir, { recursive: true });
    appendFileSync(missingLogPath, 'LISTA DE ARCHIVOS NO ENCONTRADOS\n');

    let copiedFiles = 0;
    let shortenedRoutes = 0;
    const usedPaths = new Set<string>();
    rows.forEach(row => {
      const level = levels.find(item => item.id === row.task.Levels.id);
      const parentLevels =
        level?.parentLevels?.length && level.parentLevels.length > 0
          ? level.parentLevels
          : ['_SIN_NIVEL_1'];
      const stage = row.task.Levels.stages;
      const projectFolder = `${stage.project?.name || 'Proyecto'} - ${
        stage.name
      }`;
      const personFolder = `${this.fullName(row.user.profile)}${
        row.user.profile?.dni ? ` - ${row.user.profile.dni}` : ''
      }`;

      const filesById = new Map<number, (typeof row.task.files)[number]>();
      row.task.files.forEach(file => filesById.set(file.id, file));
      row.task.feedBacks[0]?.files.forEach(file =>
        filesById.set(file.id, file)
      );

      Array.from(filesById.values()).forEach(file => {
        const oldPath = path.join(file.dir, file.name);
        const originalName = file.originalname || file.name;
        const taskItem = `${level?.item || ''}${numberToConvert(
          row.task.index,
          row.task.typeItem
        )}.`;
        const requestedName = [`${taskItem} ${row.task.name}`, originalName]
          .filter(Boolean)
          .join(' - ');
        const zipPath = this.buildMonthlyBridgeZipPath(
          {
            personFolder,
            projectFolder,
            levelFolders: parentLevels,
            fileName: requestedName,
          },
          usedPaths
        );
        const newPath = path.join(
          sourceDir,
          ...zipPath.relativePath.split('/')
        );

        if (existsSync(oldPath)) {
          const targetDir = path.dirname(newPath);
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          copyFileSync(oldPath, newPath);
          usedPaths.add(zipPath.relativePath);
          copiedFiles += 1;
          if (zipPath.wasShortened) {
            if (!shortenedRoutes) {
              appendFileSync(
                shortenedLogPath,
                'LISTA DE RUTAS ABREVIADAS POR COMPATIBILIDAD CON WINDOWS\n'
              );
            }
            shortenedRoutes += 1;
            appendFileSync(
              shortenedLogPath,
              [
                `ruta final: ${zipPath.relativePath}`,
                `ruta original: ${zipPath.originalRelativePath}`,
                `motivo: excedia ${this.zipPathLengthThreshold} caracteres`,
                '',
              ].join('\n')
            );
          }
        } else {
          appendFileSync(
            missingLogPath,
            `tarea: ${row.task.name} archivo: ${originalName} ruta: ${oldPath}\n`
          );
        }
      });
    });

    if (statSync(missingLogPath).size <= 40) rmSync(missingLogPath);
    if (!copiedFiles) {
      rmSync(sourceDir, { recursive: true, force: true });
      throw new AppError(
        'Las tareas seleccionadas no tienen archivos subidos',
        404
      );
    }

    await archiverFolder(sourceDir, outputFilePath, { removeDir: true });
    return {
      filePath: outputFilePath,
      filename: `evidencias-puente-mayo-${uniqueId}.zip`,
    };
  }

  public static async technicalEvidenceByReport(reportId: number) {
    if (!reportId) throw new AppError('Oops!, ID invalido', 400);
    const rows = await prisma.subTaskOnUsers.findMany({
      where: { reportId },
      include: this.taskEvidenceInclude(),
      orderBy: [{ task: { Levels: { stagesId: 'asc' } } }, { id: 'asc' }],
    });
    return this.groupRowsByStages(rows);
  }

  public static async workspaceLinkForTask({
    taskId,
    preferredUnitId,
    userInfo,
  }: MonthlyBridgeWorkspaceLinkParams) {
    if (!taskId || Number.isNaN(taskId)) {
      throw new AppError('ID de tarea invalido', 400);
    }

    const task = await prisma.subTasks.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        levels_Id: true,
        Levels: {
          select: {
            id: true,
            stages: {
              select: {
                id: true,
                projectId: true,
              },
            },
          },
        },
      },
    });

    if (!task) throw new AppError('No se encontro la tarea', 404);

    const stageId = task.Levels.stages.id;
    const projectId = task.Levels.stages.projectId;
    const stageFocuses = await prisma.orgUnitProjectStageFocus.findMany({
      where: {
        projectId,
        stageId,
        isCurrent: true,
        status: { not: 'INACTIVE' },
        unit: { isActive: true },
      },
      select: {
        unitId: true,
        projectFocusId: true,
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        projectFocus: {
          select: {
            id: true,
          },
        },
      },
    });

    const sortedFocuses = stageFocuses.sort((first, second) => {
      const preferredSort =
        Number(second.unitId === preferredUnitId) -
        Number(first.unitId === preferredUnitId);
      if (preferredSort) return preferredSort;
      return first.unit.name.localeCompare(second.unit.name);
    });

    for (const focus of sortedFocuses) {
      const canRead = await this.canReadWorkspaceUnit(userInfo, focus.unitId);
      if (!canRead) continue;
      const projectFocusId =
        focus.projectFocus?.id ||
        (
          await prisma.orgUnitProjectFocus.findFirst({
            where: {
              unitId: focus.unitId,
              projectId,
              isCurrent: true,
              status: { not: 'INACTIVE' },
            },
            select: { id: true },
          })
        )?.id ||
        null;

      return {
        ok: true,
        unitId: focus.unitId,
        unitName: focus.unit.name,
        projectId,
        stageId,
        levelId: task.levels_Id,
        taskId: task.id,
        focusId: projectFocusId,
      };
    }

    return {
      ok: false,
      reason: sortedFocuses.length ? 'NO_ACCESS' : 'NO_ORG_STAGE_FOCUS',
      projectId,
      stageId,
      levelId: task.levels_Id,
      taskId: task.id,
    };
  }

  public static async personnelRequests({
    payrollId,
    uploadStart,
    uploadEnd,
  }: MonthlyBridgePersonnelRequestsParams) {
    if (!payrollId) throw new AppError('No se encontro la planilla', 404);
    if (!uploadStart || !uploadEnd) {
      throw new AppError('Ingrese un rango de subida valido', 400);
    }

    const payroll = await prisma.payrolls.findUnique({
      where: { id: payrollId },
      select: { id: true },
    });
    if (!payroll) throw new AppError('No se encontro la planilla', 404);

    const now = new Date();
    const [users, uploadedRows, reports] = await Promise.all([
      prisma.users.findMany({
        where: {
          status: true,
        },
        select: {
          id: true,
          contract: true,
          payrollInfo: {
            select: {
              monthlySalary: true,
              contractStartDate: true,
              contractEndDate: true,
              contractType: true,
            },
          },
          profile: {
            select: {
              firstName: true,
              lastName: true,
              dni: true,
              degree: true,
              job: true,
            },
          },
          orgMemberships: {
            where: {
              startDate: { lte: now },
              OR: [{ endDate: null }, { endDate: { gte: now } }],
              unit: { isActive: true },
            },
            select: {
              isPrimary: true,
              role: true,
              unit: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
          },
        },
        orderBy: [
          { profile: { lastName: 'asc' } },
          { profile: { firstName: 'asc' } },
        ],
      }),
      this.findCandidateTasks({
        uploadStart,
        uploadEnd,
        status: 'ALL',
        onlyAvailable: false,
      }),
      prisma.reports.findMany({
        where: { payrollId },
        select: {
          id: true,
          name: true,
          userId: true,
          price: true,
          subprice: true,
          isAuthorizedGrop: true,
          paymessageId: true,
          paymessage: { select: { id: true, status: true } },
          task: { select: { id: true } },
          basictask: { select: { id: true } },
          operationalTasks: { select: { id: true } },
        },
      }),
    ]);

    const uploadsByUser = uploadedRows.reduce<Map<number, number>>(
      (acc, row) => {
        acc.set(row.userId, (acc.get(row.userId) || 0) + 1);
        return acc;
      },
      new Map()
    );
    const reportsByUser = reports.reduce<
      Map<
        number,
        {
          reportCount: number;
          technicalReportCount: number;
          administrativeReportCount: number;
          paymessageCount: number;
          technicalTaskCount: number;
          administrativeTaskCount: number;
          totalAmount: number;
          authorizedGroupCount: number;
          paymessageId: number | null;
          paymessageStatus: PayMessageStatus | null;
        }
      >
    >((acc, report) => {
      const current = acc.get(report.userId) || {
        reportCount: 0,
        technicalReportCount: 0,
        administrativeReportCount: 0,
        paymessageCount: 0,
        technicalTaskCount: 0,
        administrativeTaskCount: 0,
        totalAmount: 0,
        authorizedGroupCount: 0,
        paymessageId: null,
        paymessageStatus: null,
      };
      current.reportCount += 1;
      if (
        report.name.toLowerCase().includes('administrativo') ||
        (report.task.length === 0 &&
          (report.basictask.length > 0 || report.operationalTasks.length > 0))
      ) {
        current.administrativeReportCount += 1;
      } else {
        current.technicalReportCount += 1;
      }
      current.paymessageCount += report.paymessageId ? 1 : 0;
      current.technicalTaskCount += report.task.length;
      current.administrativeTaskCount +=
        report.basictask.length + report.operationalTasks.length;
      current.totalAmount += report.price || report.subprice || 0;
      if (report.isAuthorizedGrop) current.authorizedGroupCount += 1;
      if (report.paymessage) {
        current.paymessageId = report.paymessage.id;
        if (
          !current.paymessageStatus ||
          report.paymessage.status === 'PROCESO' ||
          current.paymessageStatus === 'GUARDADO'
        ) {
          current.paymessageStatus = report.paymessage.status;
        }
      }
      acc.set(report.userId, current);
      return acc;
    }, new Map());

    const responseUsers = users.map(user => {
      const reportSummary = reportsByUser.get(user.id) || {
        reportCount: 0,
        technicalReportCount: 0,
        administrativeReportCount: 0,
        paymessageCount: 0,
        technicalTaskCount: 0,
        administrativeTaskCount: 0,
        totalAmount: 0,
        authorizedGroupCount: 0,
        paymessageId: null,
        paymessageStatus: null,
      };
      const uploadTaskCount = uploadsByUser.get(user.id) || 0;
      return {
        id: user.id,
        contract: user.contract,
        payrollInfo: user.payrollInfo,
        contractMonthlySalary: Number(user.payrollInfo?.monthlySalary || 0),
        profile: user.profile,
        offices: this.resolveUserOffices(user),
        uploadTaskCount,
        reportCount: reportSummary.reportCount,
        technicalReportCount: reportSummary.technicalReportCount,
        administrativeReportCount: reportSummary.administrativeReportCount,
        paymessageCount: reportSummary.paymessageCount,
        technicalTaskCount: reportSummary.technicalTaskCount,
        administrativeTaskCount: reportSummary.administrativeTaskCount,
        totalAmount: Number(reportSummary.totalAmount.toFixed(2)),
        paymessageId: reportSummary.paymessageId,
        paymessageStatus: reportSummary.paymessageStatus,
        canSendToElaboration:
          reportSummary.paymessageStatus === 'GUARDADO' &&
          reportSummary.reportCount > 0,
        canReturnToRequests:
          reportSummary.paymessageStatus === 'PROCESO' &&
          reportSummary.authorizedGroupCount < reportSummary.reportCount,
        status:
          reportSummary.paymessageStatus === 'PROCESO' &&
          reportSummary.reportCount > 0 &&
          reportSummary.authorizedGroupCount >= reportSummary.reportCount
            ? 'WITH_CONFORMITY'
            : reportSummary.paymessageStatus === 'PROCESO'
            ? 'IN_ELABORATION'
            : reportSummary.paymessageStatus === 'GUARDADO'
            ? 'REQUEST_RECEIVED'
            : reportSummary.reportCount
            ? 'REPORT_CREATED'
            : uploadTaskCount
            ? 'READY_TO_CREATE'
            : 'WITHOUT_UPLOADS',
      };
    });

    return {
      payrollId,
      uploadStart,
      uploadEnd,
      totalUsers: responseUsers.length,
      totalUploadedTasks: uploadedRows.length,
      totalReports: reports.length,
      users: responseUsers,
    };
  }

  public static async activePayroll() {
    const payroll = await prisma.payrolls.findFirst({
      where: {
        status: true,
        reports: {
          none: {
            paymessage: { status: 'PAGADO' },
          },
        },
      },
      select: {
        id: true,
        name: true,
        pad: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!payroll) {
      throw new AppError('Primero debe crearse la planilla del periodo', 404);
    }
    return payroll;
  }

  public static async selfTechnicalTasks({
    userInfo,
    uploadStart,
    uploadEnd,
    status = 'ALL',
    projectId,
    stageId,
  }: SelfSubmissionTechnicalTasksParams) {
    const end = uploadEnd || new Date();
    const start =
      uploadStart || new Date(end.getTime() - 1000 * 60 * 60 * 24 * 45);
    const rows = await this.findCandidateTasks({
      uploadStart: start,
      uploadEnd: end,
      status,
      projectId,
      stageId,
      userId: userInfo.id,
    });
    return {
      totalTasks: rows.length,
      user: {
        id: userInfo.id,
        profile: userInfo.profile,
      },
      stages: await this.groupRowsByStages(rows),
    };
  }

  public static async createSelfTechnical({
    userInfo,
    amount,
    discountAmount = 0,
    subTaskOnUserIds,
  }: SelfSubmissionCreatePayload) {
    if (!amount || amount <= 0)
      throw new AppError('Ingrese un monto valido', 400);
    if (!subTaskOnUserIds?.length) {
      throw new AppError('Seleccione al menos una tarea', 400);
    }
    const payroll = await this.activePayroll();
    const result = await prisma.$transaction(async tx => {
      const uniqueTaskIds = [...new Set(subTaskOnUserIds)];
      const tasks = await tx.subTaskOnUsers.findMany({
        where: {
          id: { in: uniqueTaskIds },
          userId: userInfo.id,
          statusPayment: false,
          reportId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true, dni: true },
              },
            },
          },
          task: {
            select: {
              id: true,
              status: true,
              name: true,
              index: true,
              typeItem: true,
            },
          },
        },
      });
      if (tasks.length !== uniqueTaskIds.length) {
        throw new AppError(
          'Algunas tareas ya fueron usadas en otra solicitud o no pertenecen al usuario',
          409
        );
      }
      const user = tasks[0]?.user;
      if (!user) throw new AppError('No se encontro el usuario', 404);
      const office = await this.resolveLegacyOfficeForUser(tx, userInfo.id);
      const report = await tx.reports.create({
        data: {
          ...this.buildReportData({
            amount,
            discountAmount,
            userId: userInfo.id,
            officeId: office.id,
            periodStart: payroll.periodStart || this.defaultPeriodStart,
            periodEnd: payroll.periodEnd || this.defaultPeriodEnd,
          }),
          payrollId: payroll.id,
        },
      });
      await tx.subTaskOnUsers.updateMany({
        where: { id: { in: uniqueTaskIds } },
        data: {
          reportId: report.id,
          percentagePayment: 100,
          statusPayment: true,
          price: 0,
        },
      });
      await tx.subTasks.updateMany({
        where: {
          id: { in: [...new Set(tasks.map(task => task.taskId))] },
          status: { notIn: ['DENIED', 'LIQUIDATION', 'UNRESOLVED'] },
        },
        data: { status: 'REVIEWED' },
      });
      const paymessage = await this.attachReportToSavedPaymessage(tx, {
        payrollId: payroll.id,
        reportId: report.id,
        userId: userInfo.id,
        office,
        title: 'Solicitud de pago',
        header: 'Solicitud creada por usuario',
        description: 'Solicitud de pago creada por el usuario desde planillas',
      });
      return { payroll, report, paymessage };
    });
    return result;
  }

  public static async selfAdministrativePreview(userInfo: UserType) {
    const payroll = await this.activePayroll();
    const periodStart = payroll.periodStart || this.defaultPeriodStart;
    const periodEnd = payroll.periodEnd || this.defaultPeriodEnd;
    const [tasks, existingReport] = await Promise.all([
      this.findAdministrativeTasks({
        userId: userInfo.id,
        periodStart,
        periodEnd,
      }),
      prisma.reports.findFirst({
        where: {
          payrollId: payroll.id,
          userId: userInfo.id,
          paymessage: { status: 'GUARDADO' },
          name: { contains: 'Administrativo', mode: 'insensitive' },
          task: { none: {} },
        },
        select: {
          id: true,
          name: true,
          price: true,
          subprice: true,
          paymessageId: true,
          basictask: { select: { id: true } },
          operationalTasks: { select: { id: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      payroll,
      periodStart,
      periodEnd,
      contractMonthlySalary: Number(
        (userInfo as any).payrollInfo?.monthlySalary || 0
      ),
      totalTasks: tasks.length,
      tasks,
      existingReport,
    };
  }

  public static async createSelfAdministrative({
    userInfo,
    amount,
  }: {
    userInfo: UserType;
    amount: number;
  }) {
    if (!userInfo?.id) throw new AppError('Usuario no encontrado', 404);
    const payroll = await this.activePayroll();
    return this.createAdministrativeSubmission({
      userInfo,
      userId: userInfo.id,
      amount,
      payrollId: payroll.id,
    });
  }

  public static async createPersonnelAdministrative({
    payrollId,
    items,
  }: AdministrativePersonnelSubmissionPayload) {
    if (!payrollId) throw new AppError('No se encontro la planilla', 404);
    const uniqueItems = (items || []).filter(
      item => item.userId && Number(item.amount) > 0
    );
    if (!uniqueItems.length) {
      throw new AppError('Ingrese al menos un usuario y monto valido', 400);
    }
    const created = [];
    for (const item of uniqueItems) {
      created.push(
        await this.createAdministrativeSubmission({
          userId: item.userId,
          amount: Number(item.amount),
          payrollId,
        })
      );
    }
    return { created };
  }

  public static async selfSubmissions(userInfo: UserType) {
    const payroll = await this.activePayroll();
    const reports = await prisma.reports.findMany({
      where: {
        payrollId: payroll.id,
        userId: userInfo.id,
        paymessage: { status: 'GUARDADO' },
      },
      select: {
        id: true,
        name: true,
        price: true,
        subprice: true,
        paymessageId: true,
        task: { select: { id: true } },
        basictask: { select: { id: true } },
        operationalTasks: { select: { id: true } },
        createdAt: true,
        paymessage: {
          select: {
            id: true,
            status: true,
            files: {
              select: {
                id: true,
                name: true,
                path: true,
                originalname: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { payroll, reports };
  }

  public static async selfSubmissionHistory(userInfo: UserType) {
    if (!userInfo?.id) throw new AppError('Usuario no encontrado', 404);
    let activePayrollId: number | null = null;
    try {
      activePayrollId = (await this.activePayroll()).id;
    } catch {
      activePayrollId = null;
    }
    const reports = await prisma.reports.findMany({
      where: {
        userId: userInfo.id,
        payrollId: { not: null },
        NOT: activePayrollId
          ? {
              payrollId: activePayrollId,
              paymessage: { status: 'GUARDADO' },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        price: true,
        subprice: true,
        paymessageId: true,
        createdAt: true,
        task: { select: { id: true } },
        basictask: { select: { id: true } },
        operationalTasks: { select: { id: true } },
        payroll: {
          select: {
            id: true,
            name: true,
            periodStart: true,
            periodEnd: true,
          },
        },
        paymessage: {
          select: {
            id: true,
            status: true,
            files: {
              select: {
                id: true,
                name: true,
                path: true,
                originalname: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    return { reports };
  }

  public static async selfSubmissionAttachments(
    paymessageId: number,
    userInfo: UserType
  ) {
    const paymessage = await this.findOwnedPaymessage(
      paymessageId,
      userInfo.id
    );
    return { paymessageId: paymessage.id, files: paymessage.files };
  }

  public static async uploadSelfSubmissionAttachments({
    paymessageId,
    userInfo,
    files,
  }: {
    paymessageId: number;
    userInfo: UserType;
    files: { name: string; path: string; originalname?: string | null }[];
  }) {
    if (!files?.length)
      throw new AppError('Seleccione al menos un archivo', 400);
    const paymessage = await this.findOwnedPaymessage(
      paymessageId,
      userInfo.id
    );
    const result = await prisma.payMessages.update({
      where: { id: paymessage.id },
      data: {
        files: { createMany: { data: files } },
        history: {
          create: {
            title: 'Adjuntos actualizados',
            header: 'Archivos agregados por el usuario',
            userId: userInfo.id,
            description: JSON.stringify({
              office: paymessage.office?.name || '',
              subtitle: `${files.length} archivo(s) agregado(s) al tramite`,
              status: true,
            }),
          },
        },
      },
      select: {
        id: true,
        files: {
          select: {
            id: true,
            name: true,
            path: true,
            originalname: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
    return { paymessageId: result.id, files: result.files };
  }

  public static async deleteSelfSubmissionAttachment({
    paymessageId,
    fileId,
    userInfo,
  }: {
    paymessageId: number;
    fileId: number;
    userInfo: UserType;
  }) {
    const paymessage = await this.findOwnedPaymessage(
      paymessageId,
      userInfo.id
    );
    const file = paymessage.files.find(item => item.id === fileId);
    if (!file) throw new AppError('No se encontro el archivo', 404);
    await prisma.$transaction([
      prisma.filesMessage.delete({ where: { id: file.id } }),
      prisma.messageHistory.create({
        data: {
          paymessageId: paymessage.id,
          title: 'Adjuntos actualizados',
          header: 'Archivo eliminado por el usuario',
          userId: userInfo.id,
          description: JSON.stringify({
            office: paymessage.office?.name || '',
            subtitle: file.originalname || file.name,
            status: true,
          }),
        },
      }),
    ]);
    const diskPath = path.join(file.path, file.name);
    if (existsSync(diskPath)) rmSync(diskPath, { force: true });
    return { removedFileId: file.id };
  }

  public static async removeSelfReport(reportId: number, userInfo: UserType) {
    if (!reportId) throw new AppError('Reporte no encontrado', 404);
    return prisma.$transaction(async tx => {
      const report = await tx.reports.findFirst({
        where: { id: reportId, userId: userInfo.id },
        include: { paymessage: { include: { report: true } } },
      });
      if (!report || !report.paymessage) {
        throw new AppError('No se encontro la solicitud', 404);
      }
      if (report.paymessage.status !== 'GUARDADO') {
        throw new AppError('Solo puede retirar solicitudes no enviadas', 409);
      }
      await tx.subTaskOnUsers.updateMany({
        where: { reportId: report.id },
        data: {
          reportId: null,
          statusPayment: false,
          percentagePayment: 0,
          price: 0,
        },
      });
      await tx.basicTaskOnUsers.updateMany({
        where: { reports: { some: { id: report.id } } },
        data: {
          statusPayment: false,
          percentagePayment: 0,
        },
      });
      await tx.operationalTasks.updateMany({
        where: { reportId: report.id },
        data: { reportId: null },
      });
      await tx.reports.delete({ where: { id: report.id } });
      const remainingReports = report.paymessage.report.filter(
        item => item.id !== report.id
      );
      if (!remainingReports.length) {
        await tx.payMessages.delete({ where: { id: report.paymessage.id } });
      }
      return {
        removedReportId: report.id,
        removedPaymessage: !remainingReports.length,
      };
    });
  }

  private static async createAdministrativeSubmission({
    userInfo,
    userId,
    amount,
    payrollId,
  }: AdministrativeSubmissionPayload) {
    if (!amount || Number(amount) <= 0) {
      throw new AppError('Ingrese un monto valido', 400);
    }
    const payroll = payrollId
      ? await prisma.payrolls.findUnique({
          where: { id: payrollId },
          select: {
            id: true,
            name: true,
            periodStart: true,
            periodEnd: true,
            createdAt: true,
          },
        })
      : await this.activePayroll();
    if (!payroll) throw new AppError('No se encontro la planilla', 404);
    if (!payroll.periodStart || !payroll.periodEnd) {
      throw new AppError(
        'Defina el periodo de la planilla antes de crear solicitudes administrativas',
        400
      );
    }
    const periodStart = payroll.periodStart;
    const periodEnd = payroll.periodEnd;

    return prisma.$transaction(async tx => {
      const user = await tx.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true, dni: true } },
        },
      });
      if (!user) throw new AppError('Usuario no encontrado', 404);
      const existingInElaboration = await tx.payMessages.findFirst({
        where: {
          status: 'PROCESO',
          report: { some: { payrollId: payroll.id, userId } },
        },
        select: { id: true },
      });
      if (existingInElaboration) {
        throw new AppError(
          'El tramite ya esta en elaboracion; regreselo a solicitudes antes de modificar',
          409
        );
      }
      const existingReport = await tx.reports.findFirst({
        where: {
          payrollId: payroll.id,
          userId,
          paymessage: { status: { in: ['GUARDADO', 'PROCESO'] } },
        },
        select: { id: true, name: true },
      });
      if (existingReport) {
        throw new AppError(
          'El usuario ya tiene un informe en esta planilla',
          409
        );
      }
      const existingAdministrative = await tx.reports.findFirst({
        where: {
          payrollId: payroll.id,
          userId,
          paymessage: { status: { in: ['GUARDADO', 'PROCESO'] } },
          name: { contains: 'Administrativo', mode: 'insensitive' },
          task: { none: {} },
        },
        select: { id: true },
      });
      if (existingAdministrative) {
        throw new AppError(
          'El usuario ya tiene solicitud administrativa pendiente',
          409
        );
      }
      const office = await this.resolveLegacyOfficeForUser(tx, userId);
      const tasks = await this.findAdministrativeTasks({
        tx,
        userId,
        periodStart,
        periodEnd,
        onlyAvailable: true,
      });
      const report = await tx.reports.create({
        data: {
          ...this.buildReportData({
            amount: Number(amount),
            userId,
            officeId: office.id,
            periodStart,
            periodEnd,
            label: 'administrativo',
          }),
          payrollId: payroll.id,
          ...(tasks.length
            ? {
                operationalTasks: {
                  connect: tasks.map((task: { id: number }) => ({
                    id: task.id,
                  })),
                },
              }
            : {}),
        },
      });
      if (tasks.length) {
        await tx.operationalTasks.updateMany({
          where: { id: { in: tasks.map((task: { id: number }) => task.id) } },
          data: { reportId: report.id },
        });
      }
      const paymessage = await this.attachReportToSavedPaymessage(tx, {
        payrollId: payroll.id,
        reportId: report.id,
        userId,
        office,
        title: 'Solicitud administrativa de pago',
        header: 'Solicitud administrativa creada en planillas',
        description: userInfo
          ? 'Solicitud administrativa creada por el usuario desde planillas'
          : 'Solicitud administrativa creada por administracion desde recepcion',
      });
      return {
        payroll,
        report,
        paymessage,
        administrativeTaskCount: tasks.length,
      };
    });
  }

  public static async sendPaymessagesToElaboration(payload: {
    payrollId: number;
    paymessageIds: number[];
  }) {
    return this.changePaymessageRequestStatus({
      ...payload,
      from: 'GUARDADO',
      to: 'PROCESO',
      title: 'Enviado a elaboracion',
      header: 'Solicitud enviada a elaboracion de planilla',
    });
  }

  public static async returnPaymessagesToRequests(payload: {
    payrollId: number;
    paymessageIds: number[];
  }) {
    return this.changePaymessageRequestStatus({
      ...payload,
      from: 'PROCESO',
      to: 'GUARDADO',
      title: 'Regresado a solicitudes',
      header: 'Tramite regresado a solicitudes del personal',
    });
  }

  private static async changePaymessageRequestStatus({
    payrollId,
    paymessageIds,
    from,
    to,
    title,
    header,
  }: {
    payrollId: number;
    paymessageIds: number[];
    from: PayMessageStatus;
    to: PayMessageStatus;
    title: string;
    header: string;
  }) {
    const ids = [...new Set((paymessageIds || []).map(Number))].filter(Boolean);
    if (!payrollId) throw new AppError('No se encontro la planilla', 404);
    if (!ids.length) throw new AppError('Seleccione al menos un tramite', 400);

    return prisma.$transaction(async tx => {
      const paymessages = await tx.payMessages.findMany({
        where: {
          id: { in: ids },
          report: { some: { payrollId } },
        },
        include: {
          office: { select: { name: true } },
          report: {
            where: { payrollId },
            select: { id: true },
          },
        },
      });
      if (paymessages.length !== ids.length) {
        throw new AppError(
          'Algunos tramites no pertenecen a esta planilla',
          404
        );
      }
      const invalid = paymessages.find(
        paymessage => paymessage.status !== from || !paymessage.report.length
      );
      if (invalid) {
        throw new AppError(
          'Revise que los tramites tengan informes y fase valida',
          409
        );
      }

      const updates = await Promise.all(
        paymessages.map(paymessage =>
          tx.payMessages.update({
            where: { id: paymessage.id },
            data: {
              status: to,
              history: {
                create: {
                  title,
                  header,
                  description: JSON.stringify({
                    office: paymessage.office?.name || '',
                    subtitle: header,
                    status: true,
                  }),
                },
              },
            },
          })
        )
      );
      return { updated: updates.length, paymessages: updates };
    });
  }

  private static async findCandidateTasks({
    uploadStart,
    uploadEnd,
    status,
    projectId,
    stageId,
    userId,
    onlyAvailable = true,
  }: Required<
    Pick<MonthlyBridgeCandidatesParams, 'uploadStart' | 'uploadEnd'>
  > &
    Omit<MonthlyBridgeCandidatesParams, 'uploadStart' | 'uploadEnd'> & {
      userId?: number;
      onlyAvailable?: boolean;
    }) {
    const statusWhere = this.buildStatusWhere(status);
    const uploadRange = { gte: uploadStart, lte: uploadEnd };
    const rows = await prisma.subTaskOnUsers.findMany({
      where: {
        userId,
        ...(onlyAvailable
          ? {
              statusPayment: false,
              reportId: null,
              percentage: { gt: 0 },
            }
          : {}),
        OR: [
          { assignedAt: uploadRange },
          { updatedAt: uploadRange },
          { task: { updatedAt: uploadRange } },
          { task: { feedBacks: { some: { createdAt: uploadRange } } } },
          {
            task: {
              files: {
                some: {
                  type: 'UPLOADS',
                  assignedAt: uploadRange,
                },
              },
            },
          },
        ],
        task: {
          status: statusWhere,
          Levels: { stages: { id: stageId, projectId } },
        },
      },
      include: this.taskEvidenceInclude({ uploadStart, uploadEnd }),
      orderBy: [
        { user: { profile: { lastName: 'asc' } } },
        { user: { profile: { firstName: 'asc' } } },
        { task: { Levels: { stagesId: 'asc' } } },
        { task: { index: 'asc' } },
      ],
    });
    return rows;
  }

  private static buildStatusWhere(status?: BridgeCandidateStatus) {
    if (status === 'ALL') return undefined;
    if (!status || status === 'PAYABLE') {
      return { in: ['REVIEWED', 'APPROVED'] as BridgeStatus[] };
    }
    return status;
  }

  private static taskEvidenceInclude(uploadRange?: {
    uploadStart: Date;
    uploadEnd: Date;
  }) {
    return {
      user: {
        select: {
          id: true,
          contract: true,
          orgMemberships: {
            where: {
              startDate: { lte: new Date() },
              OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              unit: { isActive: true },
            },
            select: {
              isPrimary: true,
              role: true,
              unit: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: [{ isPrimary: 'desc' as const }, { role: 'asc' as const }],
          },
          profile: {
            select: {
              firstName: true,
              lastName: true,
              dni: true,
              degree: true,
              job: true,
            },
          },
        },
      },
      task: {
        select: {
          id: true,
          name: true,
          status: true,
          days: true,
          index: true,
          typeItem: true,
          price: true,
          updatedAt: true,
          reviewedAt: true,
          files: {
            where: {
              type: 'UPLOADS' as const,
              ...(uploadRange
                ? {
                    assignedAt: {
                      gte: uploadRange.uploadStart,
                      lte: uploadRange.uploadEnd,
                    },
                  }
                : {}),
            },
            select: { id: true, userId: true, assignedAt: true },
          },
          Levels: {
            select: {
              id: true,
              name: true,
              levelList: true,
              stages: {
                select: {
                  id: true,
                  name: true,
                  projectId: true,
                  project: {
                    select: {
                      id: true,
                      name: true,
                      contract: { select: { cui: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private static async groupRowsByUsers(rows: any[]) {
    const stages = await this.groupRowsByStages(rows);
    const users = new Map<number, any>();
    rows.forEach(row => {
      const current = users.get(row.userId);
      if (!current) {
        users.set(row.userId, {
          id: row.userId,
          profile: row.user.profile,
          offices: this.resolveUserOffices(row.user),
          totalTasks: 1,
          stages: [],
        });
      } else {
        current.totalTasks += 1;
      }
    });
    const stageByUser = new Map<number, BridgeStageEvidence[]>();
    rows.forEach(row => {
      const rowStages = stageByUser.get(row.userId) || [];
      const fullStage = stages.find(
        stage => stage.id === row.task.Levels.stages.id
      );
      if (fullStage && !rowStages.some(stage => stage.id === fullStage.id)) {
        rowStages.push(this.filterStageTasksByUser(fullStage, row.userId));
      }
      stageByUser.set(row.userId, rowStages);
    });
    return Array.from(users.values()).map(user => ({
      ...user,
      stages: stageByUser.get(user.id) || [],
    }));
  }

  private static async groupRowsByStages(rows: any[]) {
    const levelIds = rows.reduce<number[]>((acc, row) => {
      acc.push(...row.task.Levels.levelList, row.task.Levels.id);
      return [...new Set(acc)];
    }, []);
    const levels = await LevelsServices.getLevelsByIds(levelIds);
    const stages = new Map<number, BridgeStageEvidence>();

    rows.forEach(row => {
      const stageInfo = row.task.Levels.stages;
      const levelInfo = levels.find(level => level.id === row.task.Levels.id);
      const taskItem = numberToConvert(row.task.index, row.task.typeItem) + '.';
      if (!stages.has(stageInfo.id)) {
        stages.set(stageInfo.id, {
          id: stageInfo.id,
          name: `${stageInfo.project?.name || 'Proyecto'} - ${stageInfo.name}`,
          projectId: stageInfo.projectId,
          projectName: stageInfo.project?.name || null,
          cui: stageInfo.project?.contract?.cui || null,
          levels: [],
        });
      }
      const stage = stages.get(stageInfo.id)!;
      let level = stage.levels.find(item => item.id === row.task.Levels.id);
      if (!level) {
        level = {
          id: row.task.Levels.id,
          name: row.task.Levels.name,
          item: levelInfo?.item || '',
          parentLevels: levelInfo?.parentLevels || [],
          tasks: [],
        };
        stage.levels.push(level);
      }
      level.tasks.push({
        id: row.task.id,
        subTaskOnUserId: row.id,
        userId: row.userId,
        name: row.task.name,
        item: `${levelInfo?.item || ''}${taskItem}`,
        status: row.task.status,
        percentage: row.percentage,
        price: row.price || row.task.price,
        days: row.task.days,
        assignedAt: row.assignedAt,
        updatedAt: row.task.updatedAt,
        reviewedAt: row.task.reviewedAt,
        parentLevels: levelInfo?.parentLevels,
      });
    });
    return Array.from(stages.values());
  }

  private static filterStageTasksByUser(
    stage: BridgeStageEvidence,
    userId: number
  ) {
    return {
      ...stage,
      levels: stage.levels
        .map(level => ({
          ...level,
          tasks: level.tasks.filter((task: any) => {
            const row = task as BridgeTaskEvidence & { userId?: number };
            return row.userId === undefined || row.userId === userId;
          }),
        }))
        .filter(level => level.tasks.length),
    };
  }

  private static buildPayrollData(pad = 0) {
    const { currentYear } = Utilities.getRangeDate();
    const nextPad = pad || 1;
    const name =
      'Planilla N°' + nextPad.toString().padStart(2, '0') + '-' + currentYear;
    return { name, pad: nextPad };
  }

  private static async nextPayrollPad(tx: Pick<typeof prisma, 'payrolls'>) {
    const { startOfYear, endOfYear } = Utilities.getRangeDate();
    const quantity = await tx.payrolls.count({
      where: { createdAt: { gte: startOfYear, lte: endOfYear } },
    });
    return quantity + 1;
  }

  private static async resolveLegacyOfficeForUser(tx: any, userId: number) {
    const now = new Date();
    const memberships = await tx.organizationalMembership.findMany({
      where: {
        userId,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        unit: { isActive: true },
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
    const officeMap = memberships.find(
      (membership: any) => membership.unit?.legacyMap?.legacyType === 'OFFICE'
    )?.unit?.legacyMap;
    if (officeMap?.legacyId) {
      const mappedOffice = await tx.office.findUnique({
        where: { id: officeMap.legacyId },
        select: { id: true, name: true },
      });
      if (mappedOffice) return mappedOffice;
    }

    const fallbackOffice =
      (await tx.office.findFirst({
        where: { name: { contains: 'TECNICA', mode: 'insensitive' } },
        select: { id: true, name: true },
      })) ||
      (await tx.office.findFirst({
        where: { name: { contains: 'GENERAL', mode: 'insensitive' } },
        select: { id: true, name: true },
      })) ||
      (await tx.office.findFirst({
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      }));

    if (!fallbackOffice) {
      throw new AppError('No se encontro una oficina legacy de respaldo', 404);
    }
    return fallbackOffice;
  }

  private static async findAdministrativeTasks({
    tx = prisma,
    userId,
    periodStart,
    periodEnd,
    onlyAvailable = false,
  }: {
    tx?: any;
    userId: number;
    periodStart: Date;
    periodEnd: Date;
    onlyAvailable?: boolean;
  }) {
    const rows = await tx.operationalTasks.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
        ...(onlyAvailable
          ? {
              reportId: null,
            }
          : {}),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        projectName: true,
        status: true,
        order: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        reportId: true,
      },
      orderBy: [{ createdAt: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row: any) => ({
      ...row,
      item: row.order ? `${row.order}.` : '',
      assignedAt: row.createdAt,
      finishedAt: row.updatedAt,
      percentage: 100,
      percentagePayment: 100,
      statusPayment: Boolean(row.reportId),
      price: Number(row.price || 0),
      task: {
        id: row.id,
        name: row.name,
        status: row.status,
      },
      project: { id: null, name: row.projectName || 'Administrativo' },
      stage: {
        id: null,
        name: 'Tareas administrativas',
      },
      level: {
        id: null,
        name: row.description || 'Sin detalle',
      },
    }));
  }

  private static async attachReportToSavedPaymessage(
    tx: any,
    {
      payrollId,
      reportId,
      userId,
      office,
      title,
      header,
      description,
    }: {
      payrollId: number;
      reportId: number;
      userId: number;
      office: { id: number; name: string };
      title: string;
      header: string;
      description: string;
    }
  ) {
    const user = await tx.users.findUnique({
      where: { id: userId },
      select: { profile: { select: { firstName: true, lastName: true } } },
    });
    const existing = await tx.payMessages.findFirst({
      where: {
        status: 'GUARDADO',
        report: { some: { payrollId, userId } },
      },
      select: { id: true },
    });
    if (existing) {
      return tx.payMessages.update({
        where: { id: existing.id },
        data: {
          report: { connect: { id: reportId } },
          history: {
            create: {
              title,
              header,
              userId,
              description: JSON.stringify({
                office: office.name,
                subtitle: 'Informe agregado a solicitud pendiente',
                status: true,
              }),
            },
          },
        },
      });
    }

    return tx.payMessages.create({
      data: {
        title: `Solicitud de pago - ${this.fullName(user?.profile)}`,
        header: `Solicitud de pago - ${this.fullName(user?.profile)}`,
        description,
        type: 'INFORME',
        status: 'GUARDADO',
        office: { connect: { id: office.id } },
        historyOfficesIds: [office.id],
        onHolding: false,
        report: { connect: { id: reportId } },
        users: {
          create: {
            userId,
            userInit: true,
            status: true,
          },
        },
        history: {
          create: {
            title,
            header,
            userId,
            description: JSON.stringify({
              office: office.name,
              subtitle: 'Pendiente de envio a elaboracion de planilla',
              status: true,
            }),
          },
        },
      },
    });
  }

  private static async findOwnedPaymessage(
    paymessageId: number,
    userId: number
  ) {
    if (!paymessageId) throw new AppError('No se encontro el tramite', 404);
    const paymessage = await prisma.payMessages.findFirst({
      where: {
        id: paymessageId,
        users: { some: { userId, userInit: true } },
      },
      select: {
        id: true,
        office: { select: { name: true } },
        files: {
          select: {
            id: true,
            name: true,
            path: true,
            originalname: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
    if (!paymessage) {
      throw new AppError('Usuario no autorizado para editar este tramite', 403);
    }
    return paymessage;
  }

  private static buildReportData({
    amount,
    discountAmount = 0,
    userId,
    officeId,
    periodStart,
    periodEnd,
    label = 'mayo',
  }: {
    amount: number;
    discountAmount?: number;
    userId: number;
    officeId: number;
    periodStart: Date;
    periodEnd: Date;
    label?: string;
  }) {
    const safeDiscount = Math.max(0, Number(discountAmount || 0));
    const finalAmount = Math.max(0, amount - safeDiscount);
    return {
      name:
        label === 'administrativo'
          ? 'Reporte MENSUAL Administrativo - 2026'
          : 'Reporte  MENSUAL Puente Mayo - 2026',
      type: 'MENSUAL' as ReportUserType,
      subprice: amount,
      price: finalAmount,
      percentage: 100,
      attendanceDiscount: safeDiscount,
      userId,
      initialDate: periodStart,
      untilDate: periodEnd,
      officeId,
    };
  }

  private static fullName(
    profile?: { firstName: string; lastName: string } | null
  ) {
    if (!profile) return 'Usuario';
    return `${profile.firstName} ${profile.lastName}`.trim();
  }

  private static resolveUserOffices(user: {
    orgMemberships?: { isPrimary: boolean; unit: BridgeUserOffice }[];
  }) {
    const memberships = user.orgMemberships || [];
    const units = new Map<string, BridgeUserOffice>();
    memberships.forEach(item => {
      if (item.unit?.id) units.set(item.unit.id, item.unit);
    });
    return Array.from(units.values());
  }

  private static async canReadWorkspaceUnit(
    userInfo: UserType,
    unitId: string
  ) {
    if (MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])) return true;
    if (
      !MeetingPermissionService.hasModuleRole(userInfo, [
        'MEMBER',
        'VIEWER',
        'USER',
      ])
    ) {
      return false;
    }
    return MeetingPermissionService.isUnitMember(userInfo.id, unitId);
  }

  private static buildMonthlyBridgeZipPath(
    {
      personFolder,
      projectFolder,
      levelFolders,
      fileName,
    }: {
      personFolder: string;
      projectFolder: string;
      levelFolders: string[];
      fileName: string;
    },
    usedPaths: Set<string>
  ) {
    const originalSegments = [
      this.sanitizeZipSegment(personFolder),
      this.sanitizeZipSegment(projectFolder),
      ...(levelFolders.length ? levelFolders : ['_SIN_NIVEL_1']).map(level =>
        this.sanitizeZipSegment(level)
      ),
      this.sanitizeZipFileName(fileName),
    ];
    const originalRelativePath = this.joinZipSegments(originalSegments);
    const shortenedSegments = this.fitZipSegments(originalSegments);
    const shortenedRelativePath = this.joinZipSegments(shortenedSegments);
    const duplicateSafe = this.resolveDuplicateZipRelativePath(
      shortenedRelativePath,
      usedPaths
    );

    return {
      relativePath: duplicateSafe.relativePath,
      originalRelativePath,
      wasShortened:
        originalRelativePath !== shortenedRelativePath ||
        duplicateSafe.wasShortened,
    };
  }

  private static fitZipSegments(segments: string[]) {
    const next = [...segments];
    const lastIndex = next.length - 1;
    if (this.zipRelativeLength(next) <= this.zipPathLengthThreshold)
      return next;

    this.limitZipSegments(next, this.levelIndexes(next), 28);
    if (this.zipRelativeLength(next) <= this.zipPathLengthThreshold)
      return next;

    this.limitZipSegments(next, [1], 45);
    if (this.zipRelativeLength(next) <= this.zipPathLengthThreshold)
      return next;

    this.limitZipSegments(next, [0], 35);
    if (this.zipRelativeLength(next) <= this.zipPathLengthThreshold)
      return next;

    this.limitZipSegments(next, [lastIndex], 70, true);
    if (this.zipRelativeLength(next) <= this.zipPathLengthThreshold)
      return next;

    this.limitZipSegments(next, this.levelIndexes(next), 14);
    this.limitZipSegments(next, [1], 30);
    this.limitZipSegments(next, [0], 25);
    this.limitZipSegments(next, [lastIndex], 45, true);

    while (this.zipRelativeLength(next) > this.zipPathLengthThreshold) {
      const index = this.longestReducibleSegmentIndex(next);
      if (index === -1) break;
      next[index] = this.truncateZipSegment(
        next[index],
        next[index].length - 1,
        {
          file: index === lastIndex,
        }
      );
    }
    return next;
  }

  private static resolveDuplicateZipRelativePath(
    relativePath: string,
    usedPaths: Set<string>
  ) {
    let currentPath = relativePath;
    let wasShortened = false;
    let count = 2;
    while (usedPaths.has(currentPath)) {
      const parsed = path.posix.parse(relativePath);
      const suffix = ` (${count})`;
      const dirLength = parsed.dir ? parsed.dir.length + 1 : 0;
      const maxFileLength = Math.max(
        18,
        this.zipPathLengthThreshold - dirLength
      );
      const candidateName = this.truncateZipFileName(
        `${parsed.name}${suffix}${parsed.ext}`,
        maxFileLength
      );
      currentPath = parsed.dir
        ? path.posix.join(parsed.dir, candidateName)
        : candidateName;
      const requestedName = `${parsed.name}${suffix}${parsed.ext}`;
      wasShortened =
        wasShortened || candidateName.length < requestedName.length;
      count += 1;
    }
    return { relativePath: currentPath, wasShortened };
  }

  private static levelIndexes(segments: string[]) {
    return segments
      .map((_, index) => index)
      .filter(index => index > 1 && index < segments.length - 1);
  }

  private static limitZipSegments(
    segments: string[],
    indexes: number[],
    maxLength: number,
    file = false
  ) {
    indexes.forEach(index => {
      segments[index] = this.truncateZipSegment(segments[index], maxLength, {
        file,
      });
    });
  }

  private static longestReducibleSegmentIndex(segments: string[]) {
    const lastIndex = segments.length - 1;
    return segments.reduce(
      (best, segment, index) => {
        const minLength = index === lastIndex ? 18 : 6;
        if (segment.length <= minLength) return best;
        if (best.index === -1 || segment.length > best.length) {
          return { index, length: segment.length };
        }
        return best;
      },
      { index: -1, length: 0 }
    ).index;
  }

  private static zipRelativeLength(segments: string[]) {
    return this.joinZipSegments(segments).length;
  }

  private static joinZipSegments(segments: string[]) {
    return segments.filter(Boolean).join('/');
  }

  private static sanitizeZipSegment(value: string) {
    return this.cleanZipName(value) || 'SIN_NOMBRE';
  }

  private static sanitizeZipFileName(value: string) {
    return this.cleanZipName(value) || 'SIN_NOMBRE';
  }

  private static cleanZipName(value: string) {
    return (
      value
        ?.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[. ]+$/g, '') || ''
    );
  }

  private static truncateZipSegment(
    value: string,
    maxLength: number,
    options?: { file?: boolean }
  ) {
    if (value.length <= maxLength) return value;
    if (options?.file) return this.truncateZipFileName(value, maxLength);
    return value.slice(0, Math.max(1, maxLength)).replace(/[. ]+$/g, '');
  }

  private static truncateZipFileName(value: string, maxLength: number) {
    if (value.length <= maxLength) return value;
    const parsed = path.parse(value);
    const ext = parsed.ext || '';
    const base = parsed.name || value;
    const baseLength = Math.max(1, maxLength - ext.length);
    return `${base.slice(0, baseLength).replace(/[. ]+$/g, '')}${ext}`;
  }
}

export default PayrollMonthlyBridgeServices;
