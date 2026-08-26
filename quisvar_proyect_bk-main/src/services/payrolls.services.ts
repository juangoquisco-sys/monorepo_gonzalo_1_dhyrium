import {
  AddReportsOnPayroll,
  IPayrollWithPaymessage,
  ParamPayrolls,
  PayrollOptionsQuantity,
} from '@/types/payrolls';
import { Prisma, type Payrolls } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Utilities from '@/utils/utilities';
import AppError from '@/utils/appError';
import { ReportsByIdParameters, ReportsByOffices } from '@/types/reports';
import { v4 as uuidv4 } from 'uuid';
import PayrollQueries from '@/queries/payrolls.queries';
import Queries from '@/utils/queries';
import { UserType } from '@/middlewares/auth.middleware';
import AttendanceControlService from '@/services/attendanceControl/application/attendanceControl.service';
import LicenseServices from '@/services/licenses.services';
import { applySelectedAdvancesInTransaction } from '@/modules/liquidations/liquidationAmortization.service';
import { asLiquidationDatabase } from '@/modules/liquidations/liquidations.database';

type PayrollOrgGroup = {
  id: string;
  name: string;
  type: string;
  source: 'ORG_UNIT' | 'LEGACY_OFFICE';
};

type PayrollOrgAssignment = {
  group: PayrollOrgGroup;
  orgUnit: PayrollOrgGroup | null;
  orgUnitOverride: PayrollOrgGroup | null;
};

export enum PAYROLL_COLORS {
  '#FFFFFF00',
  '#1099BB',
  '#15AB92',
  '#A4620D',
  '#BE6061',
  '#B62545',
  '#449147',
  '#7D9707',
  '#AB4BDE',
  '#1E91ED',
  '#FF5830',
  '#E00000',
  '#F0A202',
  '#F18805',
  '#D95D39',
  '#1C3A13',
  '#05668D',
  '#028090',
  '#B41D1D',
  '#D64045',
  '#F5A65B',
  '#484A47',
  '#587B7F',
  '#72B6A1',
  '#6F4A8E',
  '#A2D729',
  '#95B46A',
  '#B29C85',
  '#C15B78',
  '#725A7A',
  '#1B998B',
  '#D1495B',
  '#F79256',
  '#EE6352',
  '#07BEB8',
  '#9A348E',
  '#E36414',
  '#FCBF49',
  '#D63447',
  '#034732',
  '#5A7D7C',
  '#595F6D',
  '#78C0E0',
  '#81D3D3',
  '#8D86C9',
  '#DAC4F7',
  '#FACCFF',
  '#DB504A',
  '#FFB563',
  '#17BEBB',
}

export default class PayrollsServices {
  public static async create({ pad: num }: { pad: number }) {
    const { currentYear } = Utilities.getRangeDate();
    const pad = num.toString().padStart(2, '0');
    const name = 'Planilla N°' + pad + '-' + currentYear;
    const createPayRoll = await prisma.payrolls.create({
      data: { name, pad: num },
    });
    return createPayRoll;
  }

  public static async update(
    id: Payrolls['id'],
    {
      name,
      pad: num,
      periodStart,
      periodEnd,
    }: {
      name?: string;
      pad?: number;
      periodStart?: string | Date | null;
      periodEnd?: string | Date | null;
    }
  ) {
    if (!id) throw new AppError('Ops!, ID invalido', 404);
    const data: {
      pad?: number;
      name?: string;
      periodStart?: Date | null;
      periodEnd?: Date | null;
    } = {};
    if (num !== undefined) {
      const { currentYear } = Utilities.getRangeDate();
      const pad = num.toString().padStart(2, '0');
      data.pad = num;
      data.name = 'Planilla N°' + pad + '-' + currentYear;
    }
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName)
        throw new AppError('El nombre no puede estar vacio', 400);
      data.name = trimmedName;
    }
    const hasPeriodStart = periodStart !== undefined;
    const hasPeriodEnd = periodEnd !== undefined;
    if (hasPeriodStart || hasPeriodEnd) {
      if (!periodStart || !periodEnd) {
        throw new AppError(
          'Debe enviar inicio y fin del lapso de planilla',
          400
        );
      }
      const parsedStart = new Date(periodStart);
      const parsedEnd = new Date(periodEnd);
      if (
        Number.isNaN(parsedStart.getTime()) ||
        Number.isNaN(parsedEnd.getTime())
      ) {
        throw new AppError('El lapso de planilla no tiene fechas validas', 400);
      }
      if (parsedStart.getTime() > parsedEnd.getTime()) {
        throw new AppError(
          'El inicio del lapso no puede ser mayor que el fin',
          400
        );
      }
      data.periodStart = parsedStart;
      data.periodEnd = parsedEnd;
    }
    const updatePayRoll = await prisma.payrolls.update({
      where: { id },
      data,
    });
    return updatePayRoll;
  }

  public static async showAll({
    limit,
    offset,
    page,
    ...options
  }: //
  ParamPayrolls) {
    const skip = Utilities.getPage({ limit, offset, page });
    const paymentGroup =
      options.paymentGroup === undefined || options.paymentGroupFinished
        ? undefined
        : options.paymentGroup
        ? { not: null }
        : null;
    const paymentGroupFinished =
      options.paymentGroupFinished === undefined
        ? undefined
        : options.paymentGroupFinished
        ? { not: null }
        : null;
    const some =
      options.paymentGroup !== undefined ||
      options.isAuthorizedGrop !== undefined
        ? {
            paymentGroup,
            isAuthorizedGrop: options.isAuthorizedGrop,
          }
        : undefined;
    const every =
      options.paymentGroupFinished !== undefined
        ? {
            paymentGroup: paymentGroupFinished,
          }
        : undefined;
    const payrolls = await prisma.payrolls.findMany({
      where: {
        status: options.status,
        reports: { some, every },
      },
      include: {
        reports: {
          where: { paymentGroup: paymentGroupFinished || paymentGroup },
          select: {
            price: true,
            paymessage: { select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
    const newPayrolls = payrolls.map(({ reports, ...payroll }) => {
      const total = reports.reduce((a, b) => a + b.price, 0);
      const hasPaidPaymessages = reports.some(
        report => report.paymessage?.status === 'PAGADO'
      );
      return { total, hasPaidPaymessages, ...payroll };
    });
    const { startOfYear, endOfYear } = Utilities.getRangeDate(new Date());
    const _total = await prisma.payrolls.count({
      where: { createdAt: { gte: startOfYear, lte: endOfYear } },
    });
    return newPayrolls;
    // return { total, data: newPayrolls };
  }

  public static async lastPad() {
    const res = await prisma.payrolls.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { pad: true },
    });
    return { pad: res?.pad || 0 };
  }

  public static async penaltySummary({
    payrollId,
    userIds,
    userInfo,
  }: {
    payrollId: number;
    userIds?: number[];
    userInfo: UserType;
  }) {
    if (!payrollId) throw new AppError('No se encontro la planilla', 404);
    const payroll = await prisma.payrolls.findUnique({
      where: { id: payrollId },
      select: { id: true, periodStart: true, periodEnd: true },
    });
    if (!payroll) throw new AppError('No se encontro la planilla', 404);
    if (!payroll.periodStart || !payroll.periodEnd) {
      return {
        payrollId,
        periodStart: payroll.periodStart,
        periodEnd: payroll.periodEnd,
        hasPeriod: false,
        users: [],
      };
    }

    const selectedUserIds = [...new Set((userIds || []).filter(Boolean))];
    const dateFrom = this.payrollPeriodDate(payroll.periodStart);
    const dateTo = this.payrollPeriodDate(payroll.periodEnd);
    const [attendanceReport, licenseReport] = await Promise.all([
      AttendanceControlService.fineReport(userInfo, {
        dateFrom,
        dateTo,
      }),
      LicenseServices.getLicensesFineReport(dateFrom, dateTo),
    ]);

    const attendanceByUser = new Map(
      attendanceReport.rows
        .filter(
          row =>
            !selectedUserIds.length || selectedUserIds.includes(row.user.id)
        )
        .map(row => [
          row.user.id,
          {
            calculatedAmount: row.calculatedAmount,
            finalAmount: row.finalAmount,
            adjustedAmount: row.adjustedAmount,
            pendingCount: row.totalRecords,
            hasAdjustment: row.hasAdjustment,
          },
        ])
    );
    const licenseByUser = this.licensePenaltySummaryByUser(
      licenseReport.rows.filter(
        row => !selectedUserIds.length || selectedUserIds.includes(row.usersId)
      ),
      licenseReport.adjustments
    );
    const ids = [
      ...new Set([
        ...selectedUserIds,
        ...attendanceByUser.keys(),
        ...licenseByUser.keys(),
      ]),
    ];

    return {
      payrollId,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      hasPeriod: true,
      users: ids.map(userId => {
        const attendance = attendanceByUser.get(userId) || {
          calculatedAmount: 0,
          finalAmount: 0,
          adjustedAmount: 0,
          pendingCount: 0,
          hasAdjustment: false,
        };
        const licenses = licenseByUser.get(userId) || {
          calculatedAmount: 0,
          finalAmount: 0,
          adjustedAmount: 0,
          pendingCount: 0,
          hasAdjustment: false,
        };
        return {
          userId,
          attendance,
          licenses,
          totalAmount: Number(
            (attendance.finalAmount + licenses.finalAmount).toFixed(2)
          ),
          calculatedAmount: Number(
            (attendance.calculatedAmount + licenses.calculatedAmount).toFixed(2)
          ),
          adjustedAmount: Number(
            (attendance.adjustedAmount + licenses.adjustedAmount).toFixed(2)
          ),
        };
      }),
    };
  }

  public static async showById(
    id: Payrolls['id'],
    options: ReportsByIdParameters
  ) {
    if (!id) throw new AppError('Oops, Id invalido', 400);
    const { paymentGroup: _pg } = options;
    const paymentGroup =
      _pg === undefined ? undefined : _pg ? { not: null } : null;
    const payrolls = await prisma.payrolls.findUnique({
      where: { id },
      include: PayrollQueries.includeById({
        isAuthorizedGrop: options.isAuthorizedGrop,
        officeId: options.officeId,
        paymentGroup,
        paymessageStatus: options.paymessageStatus,
      }),
    });
    if (!payrolls) throw new AppError('Oops!, No se encontro la planilla', 400);
    const { reports, ...payroll_data } = payrolls;
    let idAux: null | string = null;
    let arrayAuxs: string[] = [];
    const aux_payrolls = reports.reduce<IPayrollWithPaymessage[]>(
      (acc, report) => {
        const { paymessage, office, ...rest } = report;
        if (!paymessage) return acc;
        const { users, ...pm_aux } = paymessage;
        const index = acc.findIndex(i => i.id === paymessage.id);
        if (index < 0) {
          const userInit = users[0] || null;
          //-------------------- set colors ---------------------
          const pmGroupId = report.paymentGroup;
          if (idAux !== pmGroupId) {
            idAux = report.paymentGroup;
            if (pmGroupId) arrayAuxs.push(pmGroupId);
          }
          const groupId = arrayAuxs.findIndex(l => l === pmGroupId);
          const paymentId = groupId < 0 ? null : groupId + 1;
          const paymentColor = PAYROLL_COLORS[groupId < 0 ? 0 : groupId + 1];
          const color_aux = {
            isAuthorized: report.isAuthorized,
            isAuthorizedGrop: report.isAuthorizedGrop,
            paymentGroup: pmGroupId,
            paymentGroupDate: report.paymentGroupDate,
            paymentId,
            paymentColor,
          };
          const pat = { office, userInit, reports: [rest] };
          acc.push({ ...color_aux, ...pm_aux, ...pat });
        } else acc[index].reports.push(rest);
        return acc;
      },
      []
    );
    const orgAssignments = await this.resolvePayrollOrgAssignments(
      payrolls.id,
      aux_payrolls
    );
    const office_aux = aux_payrolls.reduce(
      (acc: ReportsByOffices<typeof payroll>[], payroll) => {
        const assignment = orgAssignments.get(payroll.id);
        const office =
          assignment?.group || this.legacyOfficeGroup(payroll.office);
        if (!office) return acc;
        const groupKey = this.normalizePayrollGroupName(office.name);
        const index = acc.findIndex(
          i => this.normalizePayrollGroupName(i.name) === groupKey
        );
        const total = payroll.reports.reduce((a, b) => a + b.price, 0);
        const aux = {
          ...payroll,
          legacyOffice: payroll.office,
          orgUnit: assignment?.orgUnit || null,
          orgUnitOverride: assignment?.orgUnitOverride || null,
          total,
        };
        if (index < 0) acc.push({ ...office, payMessages: [aux] });
        else acc[index].payMessages.push(aux);
        return acc;
      },
      []
    );
    const offices = office_aux.map(office => {
      const status = office.payMessages.every(r => r.isAuthorized);
      const statusGroup = office.payMessages.every(r => r.isAuthorizedGrop);
      return { ...office, status, statusGroup };
    });
    //----------------------- price payroll ----------------------------
    const subtotal = payrolls.reports.reduce((a, b) => a + b.price, 0);
    const spending = payrolls.reports.reduce((a, b) => {
      if (b.paymessage && ['PAGADO'].includes(b.paymessage.status)) return a;
      return a + b.price;
    }, 0);
    const total_aux = await prisma.reports.aggregate({
      where: {
        payrollId: id,
        isAuthorizedGrop: options.isAuthorizedGrop,
        paymentGroup,
      },
      _sum: { price: true },
    });
    const total = total_aux._sum.price || 0;
    const response = { ...payroll_data, subtotal, spending, total, offices };
    return response;
  }

  private static legacyOfficeGroup(
    office?: { id: number | string; name: string | null } | null
  ): PayrollOrgGroup | null {
    if (!office) return null;
    return {
      id: `legacy-office-${office.id}`,
      name: office.name || 'Sin unidad en organigrama',
      type: 'LEGACY_OFFICE',
      source: 'LEGACY_OFFICE',
    };
  }

  private static normalizePayrollGroupName(name?: string | null) {
    return (name || 'Sin unidad en organigrama')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private static payrollPeriodDate(date: Date) {
    const limaOffset = 5 * 60 * 60 * 1000;
    return new Date(date.getTime() - limaOffset).toISOString().slice(0, 10);
  }

  private static licensePenaltySummaryByUser(
    rows: {
      id: number;
      usersId: number;
      fine: string | null;
    }[],
    adjustments?: {
      license?: Record<number, { adjustedAmount: number }>;
      userPeriod?: Record<number, { adjustedAmount: number }>;
    }
  ) {
    const fineAmounts: Record<string, number> = {
      PUNTUAL: 0,
      TARDE: 0.5,
      SIMPLE: 10,
      GRAVE: 20,
      MUY_GRAVE: 80,
      PERMISO: 0,
      SALIDA: 0,
    };
    const grouped = new Map<
      number,
      {
        calculatedAmount: number;
        itemAdjustedAmount: number;
        pendingCount: number;
        adjustedItems: number;
      }
    >();
    rows.forEach(row => {
      const current = grouped.get(row.usersId) || {
        calculatedAmount: 0,
        itemAdjustedAmount: 0,
        pendingCount: 0,
        adjustedItems: 0,
      };
      const calculatedAmount = row.fine ? fineAmounts[row.fine] ?? 0 : 0;
      const itemAdjustment = adjustments?.license?.[row.id];
      current.calculatedAmount += calculatedAmount;
      current.itemAdjustedAmount +=
        itemAdjustment?.adjustedAmount ?? calculatedAmount;
      current.pendingCount += 1;
      if (itemAdjustment) current.adjustedItems += 1;
      grouped.set(row.usersId, current);
    });
    const result = new Map<
      number,
      {
        calculatedAmount: number;
        finalAmount: number;
        adjustedAmount: number;
        pendingCount: number;
        hasAdjustment: boolean;
      }
    >();
    grouped.forEach((value, userId) => {
      const periodAdjustment = adjustments?.userPeriod?.[userId];
      const finalAmount =
        periodAdjustment?.adjustedAmount ?? value.itemAdjustedAmount;
      result.set(userId, {
        calculatedAmount: Number(value.calculatedAmount.toFixed(2)),
        finalAmount: Number(finalAmount.toFixed(2)),
        adjustedAmount: Number(
          Math.max(value.calculatedAmount - finalAmount, 0).toFixed(2)
        ),
        pendingCount: value.pendingCount,
        hasAdjustment: Boolean(periodAdjustment || value.adjustedItems),
      });
    });
    return result;
  }

  private static unitGroup(unit: {
    id: string;
    name: string;
    type: string;
  }): PayrollOrgGroup {
    return {
      id: unit.id,
      name: unit.name,
      type: unit.type,
      source: 'ORG_UNIT',
    };
  }

  private static unitDepth(
    unitId: string,
    parentByUnitId: Map<string, string | null>
  ) {
    let depth = 0;
    let current: string | null | undefined = unitId;
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      visited.add(current);
      current = parentByUnitId.get(current);
      if (current) depth += 1;
    }
    return depth;
  }

  private static async resolvePayrollOrgAssignments(
    payrollId: number,
    paymessages: IPayrollWithPaymessage[]
  ) {
    const userIds = [
      ...new Set(
        paymessages
          .map(paymessage => paymessage.userInit?.user?.id)
          .filter((id): id is number => Boolean(id))
      ),
    ];
    const paymessageIds = paymessages.map(paymessage => paymessage.id);
    const legacyOfficeIds = [
      ...new Set(
        paymessages
          .map(paymessage => Number(paymessage.office?.id || 0))
          .filter(id => id > 0)
      ),
    ];
    const now = new Date();
    const [memberships, overrides, units, legacyOfficeMaps] = await Promise.all(
      [
        prisma.organizationalMembership.findMany({
          where: {
            userId: { in: userIds },
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            unit: { isActive: true },
          },
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
              },
            },
          },
        }),
        prisma.payrollPaymessageOrgUnitOverride.findMany({
          where: { payrollId, paymessageId: { in: paymessageIds } },
          include: {
            unit: { select: { id: true, name: true, type: true } },
          },
        }),
        prisma.organizationalUnit.findMany({
          where: { isActive: true },
          select: { id: true, parentId: true },
        }),
        prisma.organizationalUnitLegacyMap.findMany({
          where: {
            legacyType: 'OFFICE',
            legacyId: { in: legacyOfficeIds },
            unit: { isActive: true },
          },
          include: {
            unit: {
              select: { id: true, name: true, type: true },
            },
          },
        }),
      ]
    );
    const parentByUnitId = new Map(units.map(unit => [unit.id, unit.parentId]));
    const membershipsByUser = new Map<number, typeof memberships>();
    memberships.forEach(membership => {
      const list = membershipsByUser.get(membership.userId) || [];
      list.push(membership);
      membershipsByUser.set(membership.userId, list);
    });
    const overrideByPaymessage = new Map(
      overrides.map(override => [override.paymessageId, override])
    );
    const orgUnitByLegacyOffice = new Map(
      legacyOfficeMaps.map(map => [map.legacyId, map.unit])
    );
    const result = new Map<number, PayrollOrgAssignment>();

    paymessages.forEach(paymessage => {
      const override = overrideByPaymessage.get(paymessage.id);
      if (override?.unit) {
        const group = this.unitGroup(override.unit);
        result.set(paymessage.id, {
          group,
          orgUnit: group,
          orgUnitOverride: group,
        });
        return;
      }

      const userId = paymessage.userInit?.user?.id;
      const userMemberships = userId ? membershipsByUser.get(userId) || [] : [];
      const selectedMembership =
        userMemberships.find(membership => membership.isPrimary) ||
        [...userMemberships].sort((first, second) => {
          const depthDiff =
            this.unitDepth(first.unitId, parentByUnitId) -
            this.unitDepth(second.unitId, parentByUnitId);
          if (depthDiff !== 0) return depthDiff;
          const nameDiff = first.unit.name.localeCompare(second.unit.name);
          if (nameDiff !== 0) return nameDiff;
          return first.unit.id.localeCompare(second.unit.id);
        })[0];

      if (selectedMembership?.unit) {
        const group = this.unitGroup(selectedMembership.unit);
        result.set(paymessage.id, {
          group,
          orgUnit: group,
          orgUnitOverride: null,
        });
        return;
      }

      const mappedUnit = orgUnitByLegacyOffice.get(
        Number(paymessage.office?.id)
      );
      if (mappedUnit) {
        const group = this.unitGroup(mappedUnit);
        result.set(paymessage.id, {
          group,
          orgUnit: group,
          orgUnitOverride: null,
        });
        return;
      }

      const legacyGroup = this.legacyOfficeGroup(paymessage.office);
      if (legacyGroup) {
        result.set(paymessage.id, {
          group: legacyGroup,
          orgUnit: null,
          orgUnitOverride: null,
        });
      }
    });
    return result;
  }

  public static async addReport(
    id: Payrolls['id'],
    { ids }: AddReportsOnPayroll
  ) {
    if (!id) throw new AppError('Oops, Id invalido', 400);
    if (ids.some(r => r.id === undefined))
      throw new AppError('Un Elemento no tiene reporte', 400);
    const reports = await prisma.reports.findMany({
      where: { id: { in: ids.map(({ id }) => id) } },
      select: { id: true, officeId: true, payrollId: true },
    });
    if (reports.every(r => r.payrollId))
      throw new AppError('Un Elemento ya se encuentra registrado', 409);
    const connectReportUser = prisma.$transaction(
      reports.map(report => {
        return prisma.reports.update({
          where: { id: report.id },
          data: {
            payroll: { connect: { id } },
            paymessage: {
              update: {
                officeId: report.officeId,
                historyOfficesIds: { push: report.officeId },
              },
            },
          },
        });
      })
    );
    // const connectReportUser = await prisma.payrolls.update({
    //   where: { id },
    //   data: { reports: { connect: ids.map(({ id }) => ({ id })) } },
    // });
    return connectReportUser;
  }

  public static async removeItems({ ids }: AddReportsOnPayroll) {
    const office = await prisma.office.findFirst({
      where: { name: { contains: 'GENERAL', mode: 'insensitive' } },
      include: { users: { where: { isOfficeManager: true }, take: 1 } },
    });
    if (!office) throw new AppError('No se encontro la oficina', 404);
    const description = JSON.stringify({
      office: office?.name,
      subtitle: 'Retornado desde planilla',
      status: false,
    });
    const data = ids.map(message => {
      return prisma.payMessages.update({
        where: { id: message.id },
        data: {
          status: 'RECHAZADO',
          officeId: office?.id,
          beforeOffice: message.officeName,
          history: {
            create: {
              title: 'Retornado desde planilla',
              header: 'Retornado desde planilla',
              description,
              userId: office?.users[0].usersId,
            },
          },
        },
      });
    });
    const datas = await prisma.$transaction(data);
    return datas;
  }

  public static async removeItem(paymessageId: number) {
    const office = await prisma.office.findFirst({
      where: { name: { contains: 'GENERAL', mode: 'insensitive' } },
      include: { users: { where: { isOfficeManager: true }, take: 1 } },
    });
    if (!office || !office.users[0])
      throw new AppError('No se encontro la oficina de gerencia', 404);
    const description = JSON.stringify({
      office: office?.name,
      subtitle: 'Retornado desde planilla',
      status: false,
    });
    const report = await prisma.payMessages.findUnique({
      where: { id: paymessageId },
      select: {
        payrollId: true,
        id: true,
        office: { select: { name: true } },
      },
    });
    if (!report || !report?.office)
      throw new AppError('No se encontro el usuario administrador', 404);
    const { office: off } = report;
    const data = await prisma.payMessages.update({
      where: { id: paymessageId },
      data: {
        status: 'PROCESO',
        officeId: office.id,
        beforeOffice: off?.name,
        report: {
          updateMany: { where: { paymessageId }, data: { payrollId: null } },
        },
        users: {
          updateMany: {
            where: {
              AND: [{ type: 'SENDER' }, { type: 'RECEIVER' }],
              role: { not: 'SECONDARY' },
              status: { not: false },
            },
            data: { status: false },
          },
        },
        history: {
          create: {
            title: 'Retornado desde planilla',
            header: 'Retornado desde planilla',
            description,
            userId: office?.users[0].usersId,
          },
        },
      },
    });
    // const data = await prisma.$transaction(_data);
    return data;
  }

  public static async returnToElaboration(paymessageId: number) {
    if (!paymessageId) throw new AppError('No se encontro el tramite', 404);

    const result = await prisma.$transaction(async tx => {
      const paymessage = await tx.payMessages.findUnique({
        where: { id: paymessageId },
        include: {
          office: { select: { id: true, name: true } },
          report: {
            select: {
              id: true,
              price: true,
              payrollId: true,
              isAuthorized: true,
              isAuthorizedGrop: true,
              paymentGroup: true,
            },
          },
        },
      });

      if (!paymessage) throw new AppError('No se encontro el tramite', 404);

      const reportsInPayroll = paymessage.report.filter(
        report => report.payrollId
      );
      if (!reportsInPayroll.length) {
        throw new AppError('El tramite no esta agregado a una planilla', 400);
      }

      const hasAdvancedReports = reportsInPayroll.some(
        report => report.isAuthorizedGrop || report.paymentGroup
      );
      if (hasAdvancedReports) {
        throw new AppError(
          'Solo se puede retroceder tramites que esten en Sin conformidad',
          409
        );
      }

      for (const report of reportsInPayroll) {
        const taskCount = await tx.subTaskOnUsers.count({
          where: { reportId: report.id },
        });
        const taskAmount =
          taskCount > 0 ? Number((report.price / taskCount).toFixed(2)) : 0;

        await tx.subTaskOnUsers.updateMany({
          where: { reportId: report.id },
          data: {
            reportId: null,
            statusPayment: false,
            percentagePayment: 0,
            price: taskAmount,
          },
        });

        await tx.reports.update({
          where: { id: report.id },
          data: {
            payrollId: null,
            isAuthorized: false,
            isAuthorizedGrop: false,
            paymentGroup: null,
            paymentGroupDate: null,
          },
        });
      }

      const description = JSON.stringify({
        office: paymessage.office?.name || '',
        subtitle: 'Retrocedido a elaboracion de planilla',
        status: false,
      });

      const updatedPaymessage = await tx.payMessages.update({
        where: { id: paymessageId },
        data: {
          status: 'GUARDADO',
          beforeOffice: paymessage.office?.name,
          history: {
            create: {
              title: 'Retrocedido a elaboracion',
              header: 'Retrocedido a elaboracion de planilla',
              description,
            },
          },
        },
      });

      return {
        paymessage: updatedPaymessage,
        releasedReports: reportsInPayroll.length,
      };
    });

    return result;
  }

  public static async paymentItems({ ids }: AddReportsOnPayroll) {
    const groupId = uuidv4();
    const receiverOffice = await prisma.office.findFirst({
      where: { name: { contains: 'ADMINISTRACI', mode: 'insensitive' } },
    });
    if (!receiverOffice)
      throw new AppError('No se encontro la oficina de administración', 404);
    const senderOffice = 'GERENCIA GENERAL';
    const description = JSON.stringify({
      office: senderOffice,
      subtitle: 'Con conformidad  para pago de ' + senderOffice,
      status: false,
    });
    const updatePayMessages = ids.map(message => {
      return prisma.reports.update({
        where: { id: message.id },
        data: {
          paymentGroup: groupId,
          paymentGroupDate: new Date(),
          paymessage: {
            update: {
              officeId: receiverOffice.id,
              status: 'POR_PAGAR',
              beforeOffice: senderOffice,
              historyOfficesIds: { push: receiverOffice.id },
              history: {
                create: {
                  title: 'Derivado desde' + senderOffice,
                  header: 'Derivado desde planilla para pago' + senderOffice,
                  description,
                },
              },
            },
          },
        },
      });
    });
    const data = await prisma.$transaction(updatePayMessages);
    return data;
  }

  public static async authorizedReportsGroup({
    officeId,
    payrollId,
  }: {
    officeId: number | string;
    payrollId: number;
  }) {
    if (!officeId) throw new AppError('No se encontro la unidad ', 404);
    if (!payrollId) throw new AppError('No se encontro la planilla', 404);
    const receiverOffice = await prisma.office.findFirst({
      where: { name: { contains: 'GENERAL', mode: 'insensitive' } },
    });
    if (!receiverOffice)
      throw new AppError('No se encontro la oficina de GERENCIA GENERAL', 404);
    const groupReports = await this.findReportsByPayrollGroup(
      payrollId,
      String(officeId)
    );
    const paymessageList = await prisma.reports.findMany({
      where: { id: { in: groupReports.map(report => report.id) } },
      select: {
        id: true,
        isAuthorized: true,
        office: { select: { id: true, name: true } },
      },
    });
    if (!paymessageList.length) {
      throw new AppError('No hay reportes para autorizar en esta unidad', 404);
    }
    if (!paymessageList.every(l => l.isAuthorized)) {
      throw new AppError('faltan reportes pendientes para autorizar', 404);
    }
    const groupName = groupReports[0]?.groupName || 'Unidad organizacional';
    const updatePayMessages = paymessageList.map(({ office, ...message }) => {
      return prisma.reports.update({
        where: { id: message.id },
        data: {
          isAuthorizedGrop: true,
          isAuthorized: true,
          paymessage: {
            update: {
              officeId: receiverOffice.id,
              beforeOffice: groupName,
              historyOfficesIds: { push: receiverOffice.id },
              history: {
                create: {
                  title: 'Con conformidad de ' + groupName,
                  header: 'Con conformidad de ' + groupName,
                  description: JSON.stringify({
                    office: groupName,
                    legacyOffice: office.name,
                    subtitle: 'Con conformidad de ' + groupName,
                    status: true,
                  }),
                },
              },
            },
          },
        },
        select: {
          id: true,
          isAuthorizedGrop: true,
          officeId: true,
          payrollId: true,
        },
      });
    });
    const data = await prisma.$transaction(updatePayMessages);
    return data;
  }

  private static async findReportsByPayrollGroup(
    payrollId: number,
    groupId: string
  ) {
    const legacyOfficeId = groupId.startsWith('legacy-office-')
      ? Number(groupId.replace('legacy-office-', ''))
      : Number(groupId);

    if (
      !groupId.startsWith('legacy-office-') &&
      Number.isFinite(legacyOfficeId) &&
      legacyOfficeId > 0
    ) {
      const reports = await prisma.reports.findMany({
        where: { officeId: legacyOfficeId, payrollId },
        select: {
          id: true,
          office: { select: { name: true } },
        },
      });
      return reports.map(report => ({
        id: report.id,
        groupName: report.office.name || 'Oficina',
      }));
    }

    const reports = await prisma.reports.findMany({
      where: { payrollId },
      include: {
        office: { select: { id: true, name: true } },
        task: { select: { id: true } },
        basictask: { select: { id: true } },
        operationalTasks: { select: { id: true } },
        paymessage: {
          select: {
            id: true,
            office: true,
            beforeOffice: true,
            status: true,
            title: true,
            header: true,
            users: {
              where: { userInit: true },
              select: { user: Queries.selectProfileShort },
              take: 1,
            },
          },
        },
      },
    });
    const pseudoPaymessages = reports
      .filter(report => report.paymessage)
      .map(report => {
        const paymessage = report.paymessage!;
        return {
          id: paymessage.id,
          paymentGroup: report.paymentGroup,
          paymentGroupDate: report.paymentGroupDate,
          isAuthorized: report.isAuthorized,
          isAuthorizedGrop: report.isAuthorizedGrop,
          paymentId: null,
          paymentColor: PAYROLL_COLORS[0],
          office: report.office,
          beforeOffice: paymessage.beforeOffice,
          status: paymessage.status,
          title: paymessage.title,
          header: paymessage.header,
          userInit: paymessage.users[0] || null,
          reports: [report],
        } as IPayrollWithPaymessage;
      });
    const assignments = await this.resolvePayrollOrgAssignments(
      payrollId,
      pseudoPaymessages
    );
    const requestedAssignment = pseudoPaymessages
      .map(paymessage => assignments.get(paymessage.id))
      .find(assignment => assignment?.group.id === groupId);
    const requestedGroupName = requestedAssignment
      ? this.normalizePayrollGroupName(requestedAssignment.group.name)
      : '';
    return pseudoPaymessages
      .filter(paymessage => {
        const assignment = assignments.get(paymessage.id);
        if (!assignment) return false;
        if (assignment.group.id === groupId) return true;
        if (!requestedGroupName) return false;
        return (
          this.normalizePayrollGroupName(assignment.group.name) ===
          requestedGroupName
        );
      })
      .flatMap(paymessage =>
        paymessage.reports.map(report => ({
          id: report.id,
          groupName:
            assignments.get(paymessage.id)?.group.name ||
            paymessage.office?.name ||
            'Unidad organizacional',
        }))
      );
  }

  public static async setPaymessageOrgUnit({
    payrollId,
    paymessageId,
    unitId,
  }: {
    payrollId: number;
    paymessageId: number;
    unitId?: string | null;
  }) {
    if (!payrollId) throw new AppError('No se encontro la planilla', 404);
    if (!paymessageId) throw new AppError('No se encontro el tramite', 404);

    const paymessageInPayroll = await prisma.reports.findFirst({
      where: { payrollId, paymessageId },
      select: { id: true },
    });
    if (!paymessageInPayroll) {
      throw new AppError('El tramite no pertenece a esta planilla', 404);
    }

    if (!unitId) {
      await prisma.payrollPaymessageOrgUnitOverride.deleteMany({
        where: { payrollId, paymessageId },
      });
      return { payrollId, paymessageId, unitId: null };
    }

    const unit = await prisma.organizationalUnit.findFirst({
      where: { id: unitId, isActive: true },
      select: { id: true },
    });
    if (!unit) throw new AppError('Unidad organizacional no encontrada', 404);

    return prisma.payrollPaymessageOrgUnitOverride.upsert({
      where: {
        payrollId_paymessageId: {
          payrollId,
          paymessageId,
        },
      },
      create: { payrollId, paymessageId, unitId },
      update: { unitId },
      include: {
        unit: { select: { id: true, name: true, type: true } },
      },
    });
  }

  public static async updateAuthorizationOnItems({
    isAuthorized,
    ids,
  }: AddReportsOnPayroll & { isAuthorized: boolean }) {
    const authorizedItem = ids.map(message => {
      return prisma.reports.update({
        where: { id: message.id },
        data: { isAuthorized },
        select: {
          id: true,
          isAuthorized: true,
          officeId: true,
          payrollId: true,
        },
      });
    });
    const query = await prisma.$transaction(authorizedItem);
    return query;
  }

  public static async updateAuthorizationOnItemById(
    id: number,
    { isAuthorized }: { isAuthorized: boolean }
  ) {
    const query = await prisma.reports.update({
      where: { id },
      data: { isAuthorized },
      select: {
        id: true,
        isAuthorized: true,
        officeId: true,
        payrollId: true,
      },
    });
    return query;
  }

  public static async reconcileLiquidation(
    payrollId: number,
    {
      liquidationReportId,
      advanceReportIds,
    }: { liquidationReportId: number; advanceReportIds: number[] }
  ) {
    return prisma.$transaction(
      async transaction => {
        const report = await transaction.reports.findFirst({
          where: {
            id: liquidationReportId,
            payrollId,
            type: 'LIQUIDACION',
          },
          select: {
            id: true,
            userId: true,
            subprice: true,
            isAuthorized: true,
          },
        });
        if (!report) {
          throw new AppError(
            'Liquidacion no encontrada en esta planilla.',
            404,
            'PAYROLL_LIQUIDATION_NOT_FOUND'
          );
        }
        if (report.isAuthorized) {
          throw new AppError(
            'La liquidacion ya cuenta con conformidad.',
            409,
            'PAYROLL_LIQUIDATION_ALREADY_AUTHORIZED'
          );
        }

        const reconciliation = await applySelectedAdvancesInTransaction(
          asLiquidationDatabase(transaction),
          {
            liquidationReportId: report.id,
            userId: report.userId,
            grossLiquidationAmount: report.subprice,
            advanceReportIds,
          }
        );
        const reviewed = await transaction.reports.update({
          where: { id: report.id },
          data: { isAuthorized: true },
          select: {
            id: true,
            price: true,
            subprice: true,
            amortizedAmount: true,
            isAuthorized: true,
            payrollId: true,
          },
        });

        return { ...reconciliation, reviewed };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  public static async quantityPayrolls({
    padStart = 2,
    ...options
  }: PayrollOptionsQuantity) {
    const quantity = await prisma.payrolls.count({
      where: {
        status: options.status,
        createdAt: { gte: options.startOfYear, lte: options.endOfYear },
      },
    });
    const pad = quantity.toString().padStart(padStart, '0');
    return { quantity: quantity + 1, pad };
  }

  public static async remove(id: number) {
    if (!id) throw new AppError('No se encontro el id', 404);
    const removePayroll = await prisma.payrolls.delete({
      where: { id, reports: { none: {} } },
    });
    return removePayroll;
  }

  public static async changeStatus(
    id: number,
    { status }: { status: Payrolls['status'] }
  ) {
    if (!id) throw new AppError('No se encontro el id', 404);
    const updateStatus = await prisma.payrolls.update({
      where: { id },
      data: { status },
    });
    return updateStatus;
  }
}
