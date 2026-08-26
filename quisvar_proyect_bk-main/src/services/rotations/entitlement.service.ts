import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import type { RotationEntitlementQuery } from '@/types/dutyRotations';
import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';
import DutyCoveragePolicy from '@/services/rotations/dutyCoverage.policy';
import { toDutyAssignmentDto } from '@/services/rotations/dutyAssignment.dto';
import { dutyAssignmentInclude } from '@/services/rotations/dutyReconciler.service';

export const ATTENDANCE_RECONCILIATION_CAPABILITY = 'attendance.reconciliation';

class RotationEntitlementService {
  static operationalDateRange(
    periodStart: string | Date,
    periodEnd: string | Date
  ) {
    const start =
      periodStart instanceof Date
        ? DutyPlannerPolicy.formatDate(periodStart)
        : periodStart;
    const end =
      periodEnd instanceof Date
        ? DutyPlannerPolicy.formatDate(periodEnd)
        : periodEnd;
    if (start > end)
      throw new AppError('El periodo de rotacion no es valido', 400);
    return { start, end };
  }

  static accessDeadline(periodEnd: Date, accessWindowDays: number) {
    return DutyPlannerPolicy.parseDate(
      DutyPlannerPolicy.addDays(
        DutyPlannerPolicy.formatDate(periodEnd),
        accessWindowDays + 1
      )
    );
  }

  static async assertCanUseCapability(
    userId: number,
    query: RotationEntitlementQuery
  ) {
    const entitlement = await this.findEntitlement(userId, query);
    if (!entitlement) {
      throw new AppError(
        'No tienes una rotacion vigente para corregir este periodo',
        403
      );
    }
    return entitlement;
  }

  static async findEntitlement(
    userId: number,
    query: RotationEntitlementQuery
  ) {
    const { start, end } = this.operationalDateRange(
      query.periodStart,
      query.periodEnd
    );
    const referenceDate = DutyPlannerPolicy.parseDate(
      DutyPlannerPolicy.todayInLima(query.referenceDate ?? new Date())
    );
    const assignments = await prisma.dutyRotationAssignment.findMany({
      where: {
        periodStart: { lte: DutyPlannerPolicy.parseDate(end) },
        periodEnd: { gte: DutyPlannerPolicy.parseDate(start) },
        status: { in: ['PENDING', 'COMPLETED'] },
        duty: { isActive: true, capabilityKey: query.capabilityKey },
        OR: [{ assignedUserId: userId }, { executedByUserId: userId }],
      },
      include: dutyAssignmentInclude,
      orderBy: [{ periodStart: 'desc' }, { slotKey: 'asc' }],
    });
    return (
      assignments.find(assignment => {
        const deadline = this.accessDeadline(
          assignment.periodEnd,
          assignment.duty.accessWindowDays
        );
        return referenceDate < deadline;
      }) ?? null
    );
  }

  static async listMyOpenEntitlements(userId: number, capabilityKey?: string) {
    const today = DutyPlannerPolicy.parseDate(DutyPlannerPolicy.todayInLima());
    const assignments = await prisma.dutyRotationAssignment.findMany({
      where: {
        status: { in: ['PENDING', 'COMPLETED'] },
        duty: {
          isActive: true,
          capabilityKey: capabilityKey || { not: null },
        },
        OR: [{ assignedUserId: userId }, { executedByUserId: userId }],
      },
      include: dutyAssignmentInclude,
      orderBy: [{ periodStart: 'desc' }, { slotKey: 'asc' }],
    });
    return assignments
      .map(assignment => {
        const deadline = this.accessDeadline(
          assignment.periodEnd,
          assignment.duty.accessWindowDays
        );
        return {
          assignment: toDutyAssignmentDto(assignment),
          capabilityKey: assignment.duty.capabilityKey,
          periodStart: assignment.periodStart,
          periodEnd: assignment.periodEnd,
          coverageLabel:
            DutyCoveragePolicy.resolveAssignmentPeriod(assignment)
              .coverageLabel,
          accessDeadline: new Date(deadline.getTime() - 1),
        };
      })
      .filter(entitlement => today < entitlement.accessDeadline);
  }
}

export default RotationEntitlementService;
