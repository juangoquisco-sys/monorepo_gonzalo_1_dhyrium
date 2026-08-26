import { Prisma } from '@prisma/client';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import {
  type CompleteDutyAssignmentBody,
  type DutyAssignmentFilters,
  type DutyBulkDeleteAssignmentsBody,
  type DutyBulkDeleteAssignmentsResponse,
  type ReassignDutyAssignmentBody,
} from '@/types/dutyRotations';
import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';
import {
  toDutyAssignmentDto,
  toDutyAssignmentDtos,
} from '@/services/rotations/dutyAssignment.dto';
import DutyReconcilerService, {
  dutyAssignmentInclude,
  type DutyTransactionClient,
} from '@/services/rotations/dutyReconciler.service';
import {
  cleanupDutyEvidence,
  type UploadedDutyEvidence,
} from '@/services/rotations/dutyEvidence.service';

class DutyAssignmentService {
  static buildOverlapFilter(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return {};
    return {
      ...(dateTo
        ? { periodStart: { lte: DutyPlannerPolicy.parseDate(dateTo) } }
        : {}),
      ...(dateFrom
        ? { periodEnd: { gte: DutyPlannerPolicy.parseDate(dateFrom) } }
        : {}),
    } satisfies Prisma.DutyRotationAssignmentWhereInput;
  }

  static async list(filters: DutyAssignmentFilters) {
    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      throw new AppError('El rango de fechas no es valido', 400);
    }
    const assignments = await prisma.dutyRotationAssignment.findMany({
      where: {
        ...(filters.dutyId ? { dutyId: filters.dutyId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.userId
          ? {
              OR: [
                { assignedUserId: filters.userId },
                { executedByUserId: filters.userId },
              ],
            }
          : {}),
        ...this.buildOverlapFilter(filters.dateFrom, filters.dateTo),
      },
      include: dutyAssignmentInclude,
      orderBy: [{ periodStart: 'asc' }, { slotKey: 'asc' }],
    });
    return toDutyAssignmentDtos(assignments);
  }

  static async myUpcoming(userId: number, referenceDate = new Date()) {
    const today = DutyPlannerPolicy.parseDate(
      DutyPlannerPolicy.todayInLima(referenceDate)
    );
    const assignments = await prisma.dutyRotationAssignment.findMany({
      where: {
        assignedUserId: userId,
        status: { in: ['PENDING', 'OPEN_POOL', 'COMPLETED'] },
        periodEnd: { gte: today },
      },
      include: dutyAssignmentInclude,
      orderBy: [{ periodStart: 'asc' }, { slotKey: 'asc' }],
    });
    return toDutyAssignmentDtos(assignments);
  }

  private static async assertEligibleParticipant(
    dutyId: string,
    userId: number,
    client: Pick<DutyTransactionClient, 'dutyRotationParticipant'> = prisma
  ) {
    const participant = await client.dutyRotationParticipant.findFirst({
      where: {
        dutyId,
        userId,
        user: { status: true, userType: { not: 'REMOTO' } },
      },
      select: { userId: true },
    });
    if (!participant) {
      throw new AppError(
        'El usuario seleccionado no esta activo o no participa en esta actividad',
        409
      );
    }
  }

  static async complete(
    assignmentId: string,
    userId: number,
    data: CompleteDutyAssignmentBody,
    evidences: UploadedDutyEvidence[] = [],
    referenceDate = new Date()
  ) {
    const assignment = await prisma.dutyRotationAssignment.findUnique({
      where: { id: assignmentId },
      include: { duty: true, evidences: true },
    });
    if (!assignment) throw new AppError('No se pudo encontrar el turno', 404);
    if (
      assignment.status === 'COMPLETED' &&
      assignment.completionRequestKey === data.requestKey
    ) {
      await cleanupDutyEvidence(evidences);
      const replay = await prisma.dutyRotationAssignment.findUniqueOrThrow({
        where: { id: assignmentId },
        include: dutyAssignmentInclude,
      });
      return toDutyAssignmentDto(replay);
    }
    if (assignment.assignedUserId !== userId) {
      throw new AppError(
        'No puedes completar un turno asignado a otro usuario',
        403
      );
    }
    if (!['PENDING', 'OPEN_POOL'].includes(assignment.status)) {
      throw new AppError('Este turno ya no se puede completar', 409);
    }
    if (
      assignment.evidencePolicy === 'REQUIRED_PHOTO' &&
      (evidences.length < 1 || evidences.length > 3)
    ) {
      throw new AppError(
        'Debe adjuntar entre una y tres fotografias para completar el turno',
        400
      );
    }
    if (
      assignment.evidencePolicy === 'OPTIONAL_PHOTO' &&
      evidences.length > 3
    ) {
      throw new AppError('Solo puede adjuntar hasta tres fotografias', 400);
    }
    if (assignment.evidencePolicy === 'NONE' && evidences.length > 0) {
      throw new AppError(
        'Esta actividad no admite evidencias fotograficas',
        400
      );
    }
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    const periodStart = DutyPlannerPolicy.formatDate(assignment.periodStart);
    const dueOn = DutyPlannerPolicy.formatDate(assignment.dueOn);
    if (today < periodStart) {
      throw new AppError('El turno todavia no ha comenzado', 409);
    }
    if (today > dueOn) {
      throw new AppError('El plazo para completar el turno ya vencio', 409);
    }
    const executedByUserId = data.executedByUserId ?? userId;
    const notes = data.resolutionNotes?.trim() || null;
    if (executedByUserId !== assignment.assignedUserId && !notes) {
      throw new AppError(
        'Debe registrar una nota cuando el ejecutor es distinto al asignado',
        400
      );
    }
    if (executedByUserId !== assignment.assignedUserId) {
      await this.assertEligibleParticipant(assignment.dutyId, executedByUserId);
    }
    let transactionResult: {
      assignment: Parameters<typeof toDutyAssignmentDto>[0];
      replayed: boolean;
    };
    try {
      transactionResult = await prisma.$transaction(async tx => {
        const claim = await tx.dutyRotationAssignment.updateMany({
          where: {
            id: assignmentId,
            assignedUserId: userId,
            status: { in: ['PENDING', 'OPEN_POOL'] },
            completionRequestKey: null,
          },
          data: {
            executedByUserId,
            resolutionNotes: notes,
            status: 'COMPLETED',
            isLocked: true,
            completionRequestKey: data.requestKey,
          },
        });
        if (claim.count === 0) {
          const current = await tx.dutyRotationAssignment.findUnique({
            where: { id: assignmentId },
            include: dutyAssignmentInclude,
          });
          if (
            current?.status === 'COMPLETED' &&
            current.completionRequestKey === data.requestKey
          ) {
            return { assignment: current, replayed: true };
          }
          throw new AppError('Este turno ya no se puede completar', 409);
        }
        if (evidences.length) {
          await tx.dutyRotationAssignmentEvidence.createMany({
            data: evidences.map(evidence => ({
              assignmentId,
              submittedById: userId,
              storageKey: evidence.storageKey,
              originalName: evidence.originalName,
              mimeType: evidence.mimeType,
              sizeBytes: evidence.sizeBytes,
            })),
          });
        }
        const completed = await tx.dutyRotationAssignment.findUniqueOrThrow({
          where: { id: assignmentId },
          include: dutyAssignmentInclude,
        });
        return { assignment: completed, replayed: false };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'La clave de esta solicitud de completado ya fue utilizada',
          409
        );
      }
      throw error;
    }
    if (transactionResult.replayed) {
      await cleanupDutyEvidence(evidences);
    }
    return toDutyAssignmentDto(transactionResult.assignment);
  }

  static async reassign(
    assignmentId: string,
    data: ReassignDutyAssignmentBody
  ) {
    const updated = await DutyReconcilerService.withSerializableRetry(
      async tx => {
        const assignment = await tx.dutyRotationAssignment.findUnique({
          where: { id: assignmentId },
          include: { duty: { select: { assignmentStrategy: true } } },
        });
        if (!assignment) {
          throw new AppError('No se pudo encontrar el turno', 404);
        }
        if (!['PENDING', 'OPEN_POOL'].includes(assignment.status)) {
          throw new AppError('No se puede reasignar este turno', 409);
        }
        await this.assertEligibleParticipant(
          assignment.dutyId,
          data.assignedUserId,
          tx
        );
        if (assignment.duty.assignmentStrategy !== 'DISTRIBUTE_PARTICIPANTS') {
          return tx.dutyRotationAssignment.update({
            where: { id: assignmentId },
            data: {
              assignedUserId: data.assignedUserId,
              executedByUserId: null,
              status: 'PENDING',
              origin: 'MANUAL',
              isLocked: true,
            },
            include: dutyAssignmentInclude,
          });
        }
        const targetAssignment = await tx.dutyRotationAssignment.findFirst({
          where: {
            dutyId: assignment.dutyId,
            occurrenceKey: assignment.occurrenceKey,
            assignedUserId: data.assignedUserId,
            participantUniquenessScope: 'DISTRIBUTED',
            id: { not: assignment.id },
          },
        });
        if (!targetAssignment) {
          throw new AppError(
            'En una distribucion grupal la reasignacion debe intercambiar dos tareas de la misma ocurrencia',
            409
          );
        }
        if (!['PENDING', 'OPEN_POOL'].includes(targetAssignment.status)) {
          throw new AppError(
            'La tarea del participante seleccionado esta protegida y no puede intercambiarse',
            409
          );
        }
        await tx.dutyRotationAssignment.update({
          where: { id: targetAssignment.id },
          data: { participantUniquenessScope: null },
        });
        await tx.dutyRotationAssignment.update({
          where: { id: assignment.id },
          data: {
            assignedUserId: data.assignedUserId,
            executedByUserId: null,
            status: 'PENDING',
            origin: 'MANUAL',
            isLocked: true,
          },
        });
        await tx.dutyRotationAssignment.update({
          where: { id: targetAssignment.id },
          data: {
            assignedUserId: assignment.assignedUserId,
            participantUniquenessScope: 'DISTRIBUTED',
            executedByUserId: null,
            status: 'PENDING',
            origin: 'MANUAL',
            isLocked: true,
          },
        });
        return tx.dutyRotationAssignment.findUniqueOrThrow({
          where: { id: assignment.id },
          include: dutyAssignmentInclude,
        });
      }
    );
    return toDutyAssignmentDto(updated);
  }

  static async markPastPendingAsNoShow(referenceDate = new Date()) {
    const today = DutyPlannerPolicy.parseDate(
      DutyPlannerPolicy.todayInLima(referenceDate)
    );
    return prisma.dutyRotationAssignment.updateMany({
      where: {
        dueOn: { lt: today },
        status: { in: ['PENDING', 'OPEN_POOL'] },
      },
      data: { status: 'NO_SHOW', isLocked: true },
    });
  }

  static async bulkDelete(
    data: DutyBulkDeleteAssignmentsBody,
    referenceDate = new Date()
  ): Promise<DutyBulkDeleteAssignmentsResponse> {
    const ids = [...new Set(data.ids)];
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const assignments = await tx.dutyRotationAssignment.findMany({
        where: { id: { in: ids } },
        include: { swapRequests: { select: { id: true } } },
      });
      if (assignments.length !== ids.length) {
        throw new AppError(
          'Uno o mas turnos seleccionados ya no estan disponibles',
          404
        );
      }
      if (
        data.dutyId &&
        assignments.some(assignment => assignment.dutyId !== data.dutyId)
      ) {
        throw new AppError(
          'Todos los turnos seleccionados deben pertenecer a la misma actividad',
          400
        );
      }
      const deletable = assignments.filter(assignment => {
        const start = DutyPlannerPolicy.formatDate(assignment.periodStart);
        const dateAllowed = data.allowCurrentDay
          ? start >= today
          : start > today;
        return (
          dateAllowed &&
          assignment.status === 'PENDING' &&
          assignment.origin === 'AUTO' &&
          !assignment.isLocked &&
          assignment.swapRequests.length === 0
        );
      });
      const protectedCount = assignments.length - deletable.length;
      if (protectedCount && !data.deleteOnlyDeletable) {
        throw new AppError(
          'Solo se pueden eliminar turnos futuros, automaticos, pendientes y sin ajustes',
          409
        );
      }
      if (deletable.length) {
        await tx.dutyRotationAssignment.deleteMany({
          where: { id: { in: deletable.map(assignment => assignment.id) } },
        });
      }
      return {
        deletedCount: deletable.length,
        protectedCount,
        requestedCount: assignments.length,
        deletedIds: deletable.map(assignment => assignment.id),
      };
    });
  }
}

export default DutyAssignmentService;
