import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import {
  DutyAssignmentStatus,
  DutySwapRequestBody,
  DutySwapRequestStatus,
} from '@/types/dutyRotations';
import DutyReconcilerService, {
  dutyAssignmentInclude,
  type DutyTransactionClient,
} from '@/services/rotations/dutyReconciler.service';
import { toDutyAssignmentDto } from '@/services/rotations/dutyAssignment.dto';
import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';

class DutySwapService {
  private static async ensureEligibleUser(
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
        400
      );
    }
  }

  static async requestSwap(
    assignmentId: string,
    requesterUserId: number,
    data: DutySwapRequestBody
  ) {
    const today = DutyPlannerPolicy.todayInLima();
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const assignment = await tx.dutyRotationAssignment.findUnique({
        where: { id: assignmentId },
        include: { duty: true },
      });
      if (!assignment) {
        throw new AppError('No se pudo encontrar el turno', 404);
      }
      if (assignment.assignedUserId !== requesterUserId) {
        throw new AppError(
          'No puedes solicitar cambios sobre un turno asignado a otro usuario',
          403
        );
      }
      if (assignment.status !== 'PENDING') {
        throw new AppError('Solo se pueden cambiar turnos pendientes', 409);
      }
      if (DutyPlannerPolicy.formatDate(assignment.dueOn) < today) {
        throw new AppError('El turno ya vencio', 409);
      }
      if (data.targetUserId === requesterUserId) {
        throw new AppError(
          'No puede solicitar el cambio al mismo usuario',
          409
        );
      }
      const pendingRequest = await tx.dutySwapRequest.findFirst({
        where: { assignmentId, status: 'PENDING' },
        select: { id: true },
      });
      if (pendingRequest) {
        throw new AppError(
          'Este turno ya tiene una solicitud de cambio pendiente',
          409
        );
      }
      if (data.targetUserId) {
        await this.ensureEligibleUser(assignment.dutyId, data.targetUserId, tx);
      }
      if (assignment.duty.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS') {
        if (!data.targetUserId) {
          throw new AppError(
            'Las tareas distribuidas se intercambian entre dos participantes y no pueden enviarse a bolsa',
            409
          );
        }
        const targetAssignment = await tx.dutyRotationAssignment.findFirst({
          where: {
            dutyId: assignment.dutyId,
            occurrenceKey: assignment.occurrenceKey,
            assignedUserId: data.targetUserId,
            participantUniquenessScope: 'DISTRIBUTED',
            status: 'PENDING',
          },
          select: { id: true },
        });
        if (!targetAssignment) {
          throw new AppError(
            'El participante seleccionado no tiene una tarea intercambiable en esta ocurrencia',
            409
          );
        }
      }
      const swapRequest = await tx.dutySwapRequest.create({
        data: {
          assignmentId,
          requesterUserId,
          targetUserId: data.targetUserId || null,
          reason: data.reason?.trim() || null,
          status: 'PENDING' satisfies DutySwapRequestStatus,
        },
      });

      if (!data.targetUserId) {
        await tx.dutyRotationAssignment.update({
          where: { id: assignmentId },
          data: {
            status: 'OPEN_POOL' satisfies DutyAssignmentStatus,
            origin: 'OPEN_POOL',
            isLocked: true,
          },
        });
      } else {
        await tx.dutyRotationAssignment.update({
          where: { id: assignmentId },
          data: { isLocked: true },
        });
      }

      return swapRequest;
    });
  }

  static async approve(swapRequestId: string) {
    const today = DutyPlannerPolicy.todayInLima();
    const updatedAssignment = await DutyReconcilerService.withSerializableRetry(
      async tx => {
        const currentRequest = await tx.dutySwapRequest.findUnique({
          where: { id: swapRequestId },
          include: { assignment: { include: { duty: true } } },
        });
        if (!currentRequest) {
          throw new AppError(
            'No se pudo encontrar la solicitud de cambio',
            404
          );
        }
        if (currentRequest.status !== 'PENDING') {
          throw new AppError('La solicitud de cambio ya fue atendida', 409);
        }
        if (!currentRequest.targetUserId) {
          throw new AppError(
            'Las solicitudes a bolsa se atienden con reclamar',
            400
          );
        }
        if (currentRequest.assignment.status !== 'PENDING') {
          throw new AppError('El turno ya no esta pendiente', 409);
        }
        if (
          DutyPlannerPolicy.formatDate(currentRequest.assignment.dueOn) < today
        ) {
          throw new AppError('El turno ya vencio', 409);
        }
        const targetUserId = currentRequest.targetUserId;
        await this.ensureEligibleUser(
          currentRequest.assignment.dutyId,
          targetUserId,
          tx
        );
        if (
          currentRequest.assignment.duty.assignmentStrategy ===
          'DISTRIBUTE_PARTICIPANTS'
        ) {
          const targetAssignment = await tx.dutyRotationAssignment.findFirst({
            where: {
              dutyId: currentRequest.assignment.dutyId,
              occurrenceKey: currentRequest.assignment.occurrenceKey,
              assignedUserId: targetUserId,
              participantUniquenessScope: 'DISTRIBUTED',
              status: 'PENDING',
              id: { not: currentRequest.assignmentId },
            },
          });
          if (!targetAssignment) {
            throw new AppError(
              'La tarea de destino ya no esta disponible para intercambio',
              409
            );
          }
          await tx.dutyRotationAssignment.update({
            where: { id: targetAssignment.id },
            data: { participantUniquenessScope: null },
          });
          await tx.dutyRotationAssignment.update({
            where: { id: currentRequest.assignmentId },
            data: {
              assignedUserId: targetUserId,
              status: 'PENDING' satisfies DutyAssignmentStatus,
              origin: 'SWAP',
              isLocked: true,
            },
          });
          await tx.dutyRotationAssignment.update({
            where: { id: targetAssignment.id },
            data: {
              assignedUserId: currentRequest.assignment.assignedUserId,
              participantUniquenessScope: 'DISTRIBUTED',
              status: 'PENDING' satisfies DutyAssignmentStatus,
              origin: 'SWAP',
              isLocked: true,
            },
          });
        } else {
          await tx.dutyRotationAssignment.update({
            where: { id: currentRequest.assignmentId },
            data: {
              assignedUserId: targetUserId,
              status: 'PENDING' satisfies DutyAssignmentStatus,
              origin: 'SWAP',
              isLocked: true,
            },
          });
        }
        await tx.dutySwapRequest.update({
          where: { id: swapRequestId },
          data: { status: 'APPROVED' satisfies DutySwapRequestStatus },
        });
        return tx.dutyRotationAssignment.findUniqueOrThrow({
          where: { id: currentRequest.assignmentId },
          include: dutyAssignmentInclude,
        });
      }
    );
    return toDutyAssignmentDto(updatedAssignment);
  }

  static async reject(swapRequestId: string) {
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const swapRequest = await tx.dutySwapRequest.findUnique({
        where: { id: swapRequestId },
        include: { assignment: true },
      });
      if (!swapRequest) {
        throw new AppError('No se pudo encontrar la solicitud de cambio', 404);
      }
      if (swapRequest.status !== 'PENDING') {
        throw new AppError('La solicitud de cambio ya fue atendida', 409);
      }
      const rejected = await tx.dutySwapRequest.update({
        where: { id: swapRequestId },
        data: { status: 'REJECTED' satisfies DutySwapRequestStatus },
      });

      if (!swapRequest.targetUserId) {
        const pendingPoolRequests = await tx.dutySwapRequest.count({
          where: {
            assignmentId: swapRequest.assignmentId,
            targetUserId: null,
            status: 'PENDING',
            id: { not: swapRequestId },
          },
        });

        if (!pendingPoolRequests) {
          await tx.dutyRotationAssignment.update({
            where: { id: swapRequest.assignmentId },
            data: { status: 'PENDING' satisfies DutyAssignmentStatus },
          });
        }
      }

      return rejected;
    });
  }

  static async listPendingDirected() {
    const requests = await prisma.dutySwapRequest.findMany({
      where: {
        targetUserId: { not: null },
        status: 'PENDING',
        assignment: { status: 'PENDING' },
      },
      include: {
        requesterUser: { select: { id: true, email: true, profile: true } },
        targetUser: { select: { id: true, email: true, profile: true } },
        assignment: {
          include: dutyAssignmentInclude,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    return requests.map(request => ({
      ...request,
      assignment: request.assignment
        ? toDutyAssignmentDto(request.assignment)
        : request.assignment,
    }));
  }

  static async openPool(userId: number, referenceDate = new Date()) {
    const today = DutyPlannerPolicy.parseDate(
      DutyPlannerPolicy.todayInLima(referenceDate)
    );
    const requests = await prisma.dutySwapRequest.findMany({
      where: {
        requesterUserId: { not: userId },
        targetUserId: null,
        status: 'PENDING',
        assignment: {
          status: 'OPEN_POOL',
          dueOn: { gte: today },
          duty: {
            assignmentStrategy: { not: 'DISTRIBUTE_PARTICIPANTS' },
            participants: {
              some: {
                userId,
                user: { status: true, userType: { not: 'REMOTO' } },
              },
            },
          },
        },
      },
      include: {
        requesterUser: { select: { id: true, email: true, profile: true } },
        assignment: {
          include: dutyAssignmentInclude,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    return requests.map(request => ({
      ...request,
      assignment: request.assignment
        ? toDutyAssignmentDto(request.assignment)
        : request.assignment,
    }));
  }

  static async claim(swapRequestId: string, userId: number) {
    const today = DutyPlannerPolicy.todayInLima();
    const updatedAssignment = await DutyReconcilerService.withSerializableRetry(
      async tx => {
        const swapRequest = await tx.dutySwapRequest.findUnique({
          where: { id: swapRequestId },
          include: { assignment: { include: { duty: true } } },
        });
        if (!swapRequest) {
          throw new AppError('No se pudo encontrar la solicitud de bolsa', 404);
        }
        if (swapRequest.targetUserId) {
          throw new AppError('Esta solicitud no pertenece a la bolsa', 409);
        }
        if (swapRequest.status !== 'PENDING') {
          throw new AppError('Este turno ya fue tomado o atendido', 400);
        }
        if (swapRequest.assignment.status !== 'OPEN_POOL') {
          throw new AppError('El turno ya no esta disponible en bolsa', 409);
        }
        if (
          swapRequest.assignment.duty.assignmentStrategy ===
          'DISTRIBUTE_PARTICIPANTS'
        ) {
          throw new AppError(
            'Las tareas distribuidas no pueden reclamarse desde la bolsa',
            409
          );
        }
        if (swapRequest.requesterUserId === userId) {
          throw new AppError(
            'No puede reclamar su propio turno enviado a bolsa',
            400
          );
        }
        if (
          DutyPlannerPolicy.formatDate(swapRequest.assignment.dueOn) < today
        ) {
          throw new AppError('El turno de la bolsa ya vencio', 409);
        }
        await this.ensureEligibleUser(
          swapRequest.assignment.dutyId,
          userId,
          tx
        );
        await tx.dutySwapRequest.update({
          where: { id: swapRequestId },
          data: {
            targetUserId: userId,
            status: 'CLAIMED' satisfies DutySwapRequestStatus,
          },
        });

        return tx.dutyRotationAssignment.update({
          where: { id: swapRequest.assignmentId },
          data: {
            assignedUserId: userId,
            status: 'PENDING' satisfies DutyAssignmentStatus,
            origin: 'SWAP',
            isLocked: true,
          },
          include: dutyAssignmentInclude,
        });
      }
    );
    return toDutyAssignmentDto(updatedAssignment);
  }
}

export default DutySwapService;
