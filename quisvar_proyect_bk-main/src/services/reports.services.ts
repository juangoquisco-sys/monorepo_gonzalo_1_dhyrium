import { DegreeTypes, ObjectNumber, ReportForm } from '@/types/types';
import AppError from '@/utils/appError';
import {
  AttendanceListState,
  type Projects,
  type Reports,
  type Users,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Queries from '@/utils/queries';
import { findDegree, numberToConvert, roundTwoDecimail } from '@/utils/tools';
import StageServices from '@/services/stages.services';
import LicenseServices from '@/services/licenses.services';
import {
  CreateForm,
  ParametersByUser,
  ReportsByIdParameters,
  ReportSortByWeek,
  UpdateReport,
} from '@/types/reports';
import Utilities from '@/utils/utilities';
import { ProjectTask } from '@/types/task';
import LevelsServices from '@/services/levels.services';
import PayrollMonthlyBridgeServices from '@/services/payrollMonthlyBridge.services';
import role from '@/middlewares/role.middleware';
import type { UserType } from '@/middlewares/auth.middleware';

export interface StageReport {
  id: number;
  name: string;
  projectId: number;
  budget: number;
  cui: string;
  levels: any[];
}
enum ProfessionEnum {
  Practicante = 'internCost',
  Egresado = 'graduateCost',
  Bachiller = 'bachelorCost',
  Titulado = 'professionalCost',
  Magister = 'professionalCost1',
  Doctorado = 'professionalCost2',
}
class ReportsServices {
  public static getRangeDate(date: Date = new Date()) {
    const currentYear = date.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    return { startOfYear, endOfYear, currentYear };
  }

  public static async findByUser(
    userId: Users['id'],
    { type, limit, offset, page, withoutpayments, ...options }: ParametersByUser
  ) {
    if (!userId) throw new AppError('Oops!, ID invalido', 400);
    const skip = Utilities.getPage({ limit, offset, page });
    const paymessageId =
      withoutpayments === undefined
        ? undefined
        : withoutpayments
        ? { not: null }
        : null;
    const reports = await prisma.reports.findMany({
      where: {
        userId,
        type,
        paymessageId,
        initialDate: options.initialDate,
        untilDate: options.untilDate,
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
    });
    return reports;
  }

  public static async findById(
    id: Reports['id'],
    options: ReportsByIdParameters
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const group = {
      select: {
        groups: {
          where: { mod: true },
          select: { users: Queries.selectProfileShort },
          take: 1,
        },
      },
    };
    const project = {
      select: {
        id: true,
        name: true,
        contract: { select: { cui: true } },
      },
    };
    const user = {
      select: {
        profile: Queries.selectProfileShort.select.profile,
        groups: options.userinfo && {
          where: { mod: true },
          select: { users: Queries.selectProfileShort },
          take: 1,
        },
      },
    };
    const reportInfo = await prisma.reports.findUnique({
      where: { id },
      include: { user },
    });
    if (!reportInfo)
      throw new AppError('Oops!, No se encontro el informe', 400);
    const { initialDate, untilDate } = reportInfo;
    const stayPrice = 1000;

    // //------------------------ Attendance ----------------------------------
    // const attendance = await ListServices.getAttendaceListByUser(userId, {
    //   initialDate,
    //   untilDate,
    // });
    // //------------------------ Licences ----------------------------------
    // const licences = await LicenseServices.getLcenseListByUser(userId, {
    //   initialDate,
    //   untilDate,
    // });
    const parcialPrice = roundTwoDecimail(
      (reportInfo.subprice * reportInfo.percentage) / 100
    );
    const balance = roundTwoDecimail(reportInfo.price - parcialPrice);
    const totalDiscount = roundTwoDecimail(
      reportInfo.licensesDiscount +
        reportInfo.attendanceDiscount +
        reportInfo.earlyPaymentDiscount
    );
    const priceWithDiscount = roundTwoDecimail(parcialPrice - totalDiscount);
    //---------------------------------------------------------------------------------
    if (reportInfo.type === 'MENSUAL' && options.evidence === 'technical') {
      const data = await PayrollMonthlyBridgeServices.technicalEvidenceByReport(
        id
      );
      const totalHours = data.reduce(
        (stageAcc, stage) =>
          stageAcc +
          stage.levels.reduce(
            (levelAcc, level) =>
              levelAcc +
              level.tasks.reduce((taskAcc, task) => taskAcc + task.days, 0),
            0
          ),
        0
      );
      return {
        ...reportInfo,
        parcialPrice,
        balance,
        totalDiscount,
        priceWithDiscount,
        stayPrice,
        totalHours,
        data,
      };
    }
    if (
      reportInfo.type === 'MENSUAL' &&
      options.evidence === 'administrative'
    ) {
      const tasks = await prisma.operationalTasks.findMany({
        where: { reportId: id },
        select: {
          id: true,
          name: true,
          description: true,
          projectName: true,
          status: true,
          order: true,
          price: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ createdAt: 'asc' }, { order: 'asc' }, { id: 'asc' }],
      });
      return {
        ...reportInfo,
        parcialPrice,
        balance,
        totalDiscount,
        priceWithDiscount,
        stayPrice,
        totalHours: tasks.length,
        data: tasks.map(task => ({
          ...task,
          item: task.order ? `${task.order}.` : '',
          assignedAt: task.createdAt,
          finishedAt: task.updatedAt,
          percentage: 100,
          percentagePayment: 100,
          statusPayment: true,
          price: Number(task.price || 0),
          task: {
            id: task.id,
            name: task.name,
            status: task.status,
          },
          project: { id: null, name: task.projectName || 'Administrativo' },
          stage: { id: null, name: 'Tareas administrativas' },
          level: { id: null, name: task.description || 'Sin detalle' },
        })),
      };
    }
    if (reportInfo.type === 'MENSUAL') {
      const opstasks = await prisma.operationalTasks.findMany({
        where: {
          userId: reportInfo.userId,
          createdAt: { gte: initialDate, lte: untilDate },
        },
        select: {
          id: true,
          order: true,
          name: true,
          createdAt: true,
          description: true,
          status: true,
          projectName: true,
        },
        orderBy: [{ createdAt: 'asc' }, { order: 'asc' }],
      });
      const timeRange = untilDate.getTime() - initialDate.getTime(); //inverse
      const daysOnRange = Math.ceil(timeRange / (1000 * 60 * 60 * 24 * 7)) * 7;
      const { listDates } = Utilities.getDatesOnWeek(initialDate, daysOnRange);
      //-------------------------------------------------------------------------
      const totalDays = listDates.map(day => ({
        ...day,
        tasks: [] as typeof opstasks,
      }));
      opstasks.forEach(task => {
        const index = totalDays.findIndex(
          ({ _id }) => _id === task.createdAt.getTime()
        );
        if (index >= 0) totalDays[index]['tasks'].push(task);
      });
      //-------------------------------------------------------------------------
      let aux: null | number = null;
      const data = totalDays.reduce(
        (acc: ReportSortByWeek<typeof item>[], item) => {
          const day = item.date.getDay();
          const index = acc.findIndex(({ id }) => id === aux);
          if (day === 0) {
            aux = item.date.getTime();
            acc.push({
              id: aux,
              initialDateWeek: item.date,
              finalDateWeek: item.date,
              days: [item],
            });
          }
          if (index >= 0 && day > 0) {
            acc[index].days.push(item);
            if (day === 6 && aux) {
              acc[index].finalDateWeek = item.date;
              aux = null;
            }
          }
          return acc;
        },
        []
      );
      return {
        ...reportInfo,
        parcialPrice,
        balance,
        totalDiscount,
        priceWithDiscount,
        stayPrice,
        data,
      };
    }
    const reportTasks = await prisma.subTaskOnUsers.findMany({
      where: { reportId: id },
      include: {
        task: {
          select: {
            name: true,
            price: true,
            status: true,
            days: true,
            Levels: {
              select: {
                id: true,
                levelList: true,
                stages: {
                  select: {
                    id: true,
                    name: true,
                    monthlyPrice: true,
                    stayPrice: true,
                    budget: true,
                    group,
                    project,
                  },
                },
              },
            },
            mods: Queries.selectProfileShort,
          },
        },
      },
      orderBy: { item: 'asc' },
    });
    const totalHours = reportTasks.reduce<number>((acc, n) => {
      const hours = (n.percentage * n.task.days) / 100;
      return acc + hours;
    }, 0);

    //obtein all levels for task
    const levelsId = [
      ...new Set(
        reportTasks.flatMap(({ task }) => [
          ...task.Levels.levelList,
          task.Levels.id,
        ])
      ),
    ];

    const tasklevels = await LevelsServices.getLevelsByIds(levelsId);

    const stagesMap = new Map<number, StageReport>();

    const tasksGroupByLevels = tasklevels
      .map(level => {
        const tasks = reportTasks.filter(
          ({ task }) => task.Levels.id === level.id
        );

        if (tasks.length === 0) return null;

        const { Levels, mods: _, ..._task } = tasks[0].task;
        const stage = Levels.stages;

        if (!stagesMap.has(stage.id)) {
          stagesMap.set(stage.id, {
            id: stage.id,
            name: `${stage.project.name} - ${stage.name}`,
            projectId: stage.project.id,
            budget: stage.budget,
            cui: stage.project.contract.cui,
            levels: [],
          });
        }
        const initialCostPerMonth = Levels.stages.monthlyPrice;
        const transformedTasks = tasks.map(({ task, ...list }) => ({
          ...list,
          stageId: stage.id,
          projectId: stage.project.id,
          taskInfo: {
            ...task,
            price:
              +task.price ||
              +((initialCostPerMonth / 30) * _task.days).toFixed(2) ||
              0,
            moderator: task.mods[0],
            initialCost: initialCostPerMonth / 30,
            initialCostPerMonth,
            coordinator: Levels.stages.group?.groups[0]?.users.profile,
          },
        }));

        return {
          ...level,
          stageId: stage.id,
          tasks: transformedTasks,
        };
      })
      .filter(Boolean);

    tasksGroupByLevels.forEach(level => {
      stagesMap.get(level!.stageId)?.levels.push(level);
    });

    const levelTasksGroupByStage = Array.from(stagesMap.values());

    return {
      ...reportInfo,
      parcialPrice,
      balance,
      totalDiscount,
      priceWithDiscount,
      stayPrice,
      totalHours,
      data: levelTasksGroupByStage,
    };
  }

  public static async create({
    ids,
    userId,
    untilDate,
    initialDate,
    percentage,
    officeId,
    type = 'ADELANTO',
    totalPrice,
  }: CreateForm & { totalPrice?: number }) {
    if (!userId) throw new AppError('Oops!, ID invalido', 400);
    if (!officeId)
      throw new AppError('El usuario debe contar con alguna gerencia ', 400);
    const {
      endOfYear: lte,
      startOfYear: gte,
      currentYear,
    } = this.getRangeDate();

    const total = await prisma.reports.count({
      where: { userId, type, createdAt: { gte, lte } },
    });
    const _total = (total + 1).toString().padStart(3, '0');
    const name = `Reporte ${
      type !== 'MENSUAL' ? 'de' : ''
    }  ${type} N° ${_total} - ${currentYear}`;
    const subprice = totalPrice || ids.reduce((a, b) => a + b.price, 0);
    const createReport = await prisma.reports.create({
      data: {
        name,
        type,
        subprice,
        price: (subprice * percentage) / 100,
        percentage,
        userId,
        initialDate,
        untilDate,
        officeId,
        // task: { connect: ids.map(({ id }) => ({ id })) },
      },
    });
    const updateList = ids.map(item => {
      return prisma.subTaskOnUsers.update({
        where: { id: item.id },
        data: {
          reportId: createReport.id,
          percentagePayment: percentage,
          statusPayment: true,
          item: item.item,
          price: item.price,
          // status: false,
        },
        select: {
          id: true,
          percentagePayment: true,
          userId: true,
          taskId: true,
          groupId: true,
        },
      });
    });
    const tasks = await prisma.$transaction(updateList);
    const newTasks = await prisma.$transaction(
      tasks
        .filter(t => !t.groupId)
        .map(({ taskId, userId }) => {
          return prisma.subTaskOnUsers.create({
            data: { userId, taskId, status: true },
          });
        })
    );
    return { ...createReport, newTasks };
  }

  public static async updateItems(
    reportId: number,
    {
      ids,
      subtotal,
      total,
      licensesDiscount,
      attendanceDiscount,
      earlyPaymentDiscount,
      percentagePayment,
      preserveRequestedAmount,
    }: UpdateReport,
    userInfo: UserType
  ) {
    if (!reportId || !Number.isSafeInteger(reportId)) {
      throw new AppError('ID de informe invalido', 400);
    }

    const currentReport = await prisma.reports.findUnique({
      where: { id: reportId },
      select: { id: true, userId: true, isAuthorized: true },
    });
    if (!currentReport) throw new AppError('Reporte no encontrado', 404);

    const canManagePayroll = role.accessMenuPoint(
      userInfo,
      ['MOD'],
      'tramites',
      'planilla'
    );
    if (currentReport.userId !== userInfo.id && !canManagePayroll) {
      throw new AppError('No tiene permisos para editar este informe', 403);
    }
    if (currentReport.isAuthorized) {
      throw new AppError(
        'El informe ya cuenta con conformidad y no puede modificarse',
        409
      );
    }

    const subtotalNumber = Number(subtotal);
    const totalNumber = Number(total);
    if (
      !Number.isFinite(subtotalNumber) ||
      !Number.isFinite(totalNumber) ||
      subtotalNumber < 0 ||
      totalNumber < 0
    ) {
      throw new AppError('Los montos de valorización deben ser válidos', 400);
    }
    const items = ids || [];
    if (
      items.some(
        item =>
          !Number.isSafeInteger(Number(item.id)) ||
          !Number.isFinite(Number(item.price)) ||
          Number(item.price) < 0 ||
          !Number.isFinite(Number(item.percentage)) ||
          Number(item.percentage) < 0 ||
          Number(item.percentage) > 100 ||
          !Number.isFinite(Number(item.days)) ||
          Number(item.days) < 0
      )
    ) {
      throw new AppError('Los items de valorización no son válidos', 400);
    }

    const itemIds = [...new Set(items.map(item => Number(item.id)))];
    if (itemIds.length !== items.length) {
      throw new AppError('Los items de valorización están duplicados', 400);
    }
    if (itemIds.length) {
      const reportItems = await prisma.subTaskOnUsers.findMany({
        where: { id: { in: itemIds }, reportId },
        select: { id: true },
      });
      if (reportItems.length !== itemIds.length) {
        throw new AppError('Algunos items no pertenecen a este informe', 400);
      }
    }

    const updateList = items.map(item => {
      return prisma.subTaskOnUsers.update({
        where: { id: item.id },
        data: {
          percentage: item.percentage,
          price: item.price,
          task: { update: { days: item.days } },
        },
      });
    });
    const tasks = updateList.length
      ? await prisma.$transaction(updateList)
      : [];
    const report = await prisma.reports.update({
      where: { id: reportId },
      data: {
        ...(preserveRequestedAmount ? {} : { subprice: subtotal }),
        price: total,
        licensesDiscount,
        attendanceDiscount,
        earlyPaymentDiscount: earlyPaymentDiscount || 0,
        percentage: percentagePayment,
        ...(items.length
          ? {
              task: {
                updateMany: {
                  where: { reportId },
                  data: { percentagePayment },
                },
              },
            }
          : {}),
      },
      include: { task: true },
    });
    return { ...report, tasks };
  }

  public static async remove(id: Reports['id']) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const getReport = await prisma.reports.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!getReport) throw new AppError('Reporte no encontrado', 404);
    const queries = [
      prisma.subTaskOnUsers.updateMany({
        where: { reportId: id },
        data: { statusPayment: false, percentagePayment: 0, price: 0 },
      }),
      prisma.reports.delete({ where: { id } }),
      prisma.subTaskOnUsers.deleteMany({
        where: {
          userId: getReport.userId,
          percentage: 0,
          percentagePayment: 0,
          task: { status: 'REVIEWED' },
        },
      }),
    ];
    const deleteReport = await prisma.$transaction(queries).then(res => res[1]);
    return deleteReport;
  }

  public static async removeItems(
    id: Reports['id'],
    { ids }: { ids: ReportForm['ids'] }
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const queries = [
      prisma.basicTaskOnUsers.updateMany({
        where: { id: { in: ids } },
        data: {
          percentagePayment: 0,
          statusPayment: false,
        },
      }),
      prisma.reports.update({
        where: { id },
        data: { basictask: { disconnect: ids.map(id => ({ id })) } },
      }),
    ];
    const deleteReport = await prisma.$transaction(queries).then(res => res[1]);
    return deleteReport;
  }

  public static async isAuthorizedItem(
    id: number,
    data: { isAuthorized: boolean }
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const updateTask = await prisma.subTaskOnUsers.update({
      where: { id },
      data,
    });
    return updateTask;
  }

  static async getReportByUser(
    userId: Users['id'],
    initialDate: Date,
    untilDate: Date,
    status?: 'DONE' | 'LIQUIDATION'
  ) {
    if (!userId) throw new AppError('Oops!, ID invalido', 400);
    const GMT = 60 * 60 * 1000;
    console.log(status);
    //----------------------- Time to 000Z --------------------------
    const _startDate = new Date(initialDate).getTime();
    const _endDate = new Date(untilDate).getTime();
    const startOfDay = new Date(_startDate + GMT * 5);
    const endOfDay = new Date(_endDate + GMT * 29 - 1);
    /*---------------------- User Details ------------------------------------
      This section deals with user information and details.
    */
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            description: true,
            degree: true,
          },
        },
      },
    });
    if (!user) throw new AppError('Oops!, ID invalido', 400);
    /*------------------------ Get user degree ----------------------------------
      This section deals show user details on attendance.
    */
    // const findDegreeUser = DEGREE_DATA.find(({ values }) =>
    //   values.some(({ value }) => value === user.profile?.degree)
    // );
    const findDegreeUser = findDegree(user.profile?.degree as DegreeTypes);
    /*------------------------ User Attendance ----------------------------------
      This section deals show user details on attendance.
    */
    const list = await prisma.listOnUsers.groupBy({
      by: ['status'],
      where: {
        usersId: userId,
        assignedAt: { gte: startOfDay, lte: endOfDay },
        list: { state: AttendanceListState.FINALIZED },
      },
      _count: { status: true },
    });
    const attendance = list.reduce((acc: ObjectNumber, _list) => {
      const status = _list.status;
      if (!acc[status]) acc[status] = 0;
      acc[status] = _list._count.status;
      return acc;
    }, {});
    /*------------------------ User Attendance ----------------------------------
      This section deals show user details on attendance.
    */
    const listLicenses = await prisma.licenses.findMany({
      where: {
        usersId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        checkout: true,
        fine: true,
      },
    });
    const license = LicenseServices.countFee(listLicenses);
    /* --------------------------- Subtasks by User ------------------------------
      This section, user tasks are filtered based on their status, start date,
      and until date.
    */
    const reportList = await prisma.taskOnUsers.findMany({
      where: {
        assignedAt: { gte: startOfDay, lte: endOfDay },
        userId,
        subtask: {
          status: { notIn: ['DENIED', 'LIQUIDATION', 'UNRESOLVED'] },
        },
        // subtask: status
        //   ? { status }
        //   : { status: { notIn: ['DENIED', 'LIQUIDATION', 'UNRESOLVED'] } },
      },
      select: {
        percentage: true,
        untilDate: true,
        assignedAt: true,
        subtask: {
          select: {
            item: true,
            days: true,
            status: true,
            name: true,
            feedBacks: true,
            users: true,
            Levels: {
              select: {
                stages: {
                  select: {
                    name: true,
                    bachelorCost: true,
                    professionalCost: true,
                    graduateCost: true,
                    internCost: true,
                    moderator: Queries.selectProfileShort,
                    project: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!reportList) new AppError('no se pudo encontrar los registros', 404);
    /* ---------------------- Project List ----------------------------------------
     This section details the list of existing projects
    */
    const getProjectIds = reportList.map(
      ({ subtask }) => subtask.Levels.stages.project.id
    );
    const projectIdList = [...new Set(getProjectIds)];
    const projectList = await prisma.projects.findMany({
      where: { id: { in: projectIdList } },
      select: {
        id: true,
        name: true,
        moderator: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    /* ---------------------- Transform Data by Price per Role ----------------------
      This section transforms the given data by accumulating prices for each bachelor
      or professional role.
    */
    const newReport = reportList.map(({ subtask, ...data }) => {
      const { stages } = subtask.Levels;
      const {
        project,
        bachelorCost,
        professionalCost,
        graduateCost,
        internCost,
      } = stages;
      //------------------------ Calculate pricing per degree --------------------------
      const degreePrice =
        findDegreeUser?.degree === 'bachelor'
          ? bachelorCost
          : findDegreeUser?.degree === 'graduate'
          ? graduateCost
          : findDegreeUser?.degree === 'intern'
          ? internCost
          : findDegreeUser?.degree === 'professional'
          ? professionalCost
          : 0;
      //------------------------ Add pricing per degree --------------------------
      const price = roundTwoDecimail(subtask.days * (degreePrice / 30));
      const stayPrice = roundTwoDecimail(
        subtask.days * (StageServices.estadia / 30)
      );
      const totalPrice = price + stayPrice;
      const pricing = { price, stayPrice, totalPrice };
      //------------------------------------------------------------------------
      return { ...data, ...pricing, ...subtask, project };
    });
    /* ---------------------- Parsing Subtask per Projects ----------------------------------------
     This section details the list of existing subtask by projects
    */
    const projects = projectList.map(({ id, ..._project }) => {
      const subtasksList = newReport.filter(({ project }) => project.id === id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const subtasks = subtasksList.map(({ project, ...sub }) => ({ ...sub }));
      return { ..._project, subtasks };
    });
    // const projects = newReportByList.filter(
    //   project => project.subtasks.length !== 0
    // );
    return { user, attendance, license, projects };
  }

  /**
   * @deprecated
   */
  static async getSubTasksByProyect(projectId: Projects['id']) {
    console.log(projectId);
    const findSubtasks = await prisma.subTasks.findMany({
      where: {
        // OR: [
        //   {
        //     task_lvl_3: {
        //       task_2: { task: { indexTask: { workArea: { projectId } } } },
        //     },
        //   },
        //   {
        //     indexTask: { workArea: { projectId } },
        //   },
        //   {
        //     task_lvl_2: { task: { indexTask: { workArea: { projectId } } } },
        //   },
        //   {
        //     task: { indexTask: { workArea: { projectId } } },
        //   },
        // ],
      },
      select: {
        id: true,
        status: true,
        files: {
          select: { id: true, dir: true, type: true, subTasksId: true },
        },
      },
    });
    return findSubtasks;
  }

  private static professionUser(profession: keyof typeof ProfessionEnum) {
    const professionList = ['Titulado', 'Magister', 'Doctorado'];
    if (professionList.includes(profession)) return ProfessionEnum.Titulado;
    return ProfessionEnum[profession];
  }
}
export default ReportsServices;
