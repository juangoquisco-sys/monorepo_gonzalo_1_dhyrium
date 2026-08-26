import type { Prisma } from '@prisma/client';
import type { dutyAssignmentInclude } from '@/services/rotations/dutyReconciler.service';
import DutyCoveragePolicy from '@/services/rotations/dutyCoverage.policy';
import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';
import {
  dutyAssignmentDtoSchema,
  type DutyAssignmentDto,
} from '@/services/rotations/duty.schema';

type DutyAssignmentPayload = Prisma.DutyRotationAssignmentGetPayload<{
  include: typeof dutyAssignmentInclude;
}>;

const formatDateOnly = (value: Date) => DutyPlannerPolicy.formatDate(value);

const toAssignmentUserDto = (
  user:
    | DutyAssignmentPayload['assignedUser']
    | DutyAssignmentPayload['executedByUser']
) =>
  user
    ? {
        id: user.id,
        email: user.email,
        profile: user.profile
          ? {
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
            }
          : null,
      }
    : null;

export const toDutyAssignmentDto = (
  assignment: DutyAssignmentPayload
): DutyAssignmentDto => {
  const coverage = DutyCoveragePolicy.resolveAssignmentPeriod(assignment);
  const dto = {
    id: assignment.id,
    dutyId: assignment.dutyId,
    duty: {
      id: assignment.duty.id,
      name: assignment.duty.name,
      capabilityKey: assignment.duty.capabilityKey,
      participants: assignment.duty.participants.map(participant => ({
        id: participant.id,
        dutyId: participant.dutyId,
        userId: participant.userId,
        position: participant.position,
        user: toAssignmentUserDto(participant.user),
      })),
    },
    occurrenceKey: assignment.occurrenceKey,
    periodStart: formatDateOnly(assignment.periodStart),
    periodEnd: formatDateOnly(assignment.periodEnd),
    dueOn: formatDateOnly(assignment.dueOn),
    slotKey: assignment.slotKey,
    slotLabel: assignment.slotLabel,
    slotInstructions: assignment.slotInstructions,
    baseSlotKey: assignment.baseSlotKey,
    slotPosition: assignment.slotPosition,
    assignedUserId: assignment.assignedUserId,
    assignedUser: toAssignmentUserDto(assignment.assignedUser),
    executedByUserId: assignment.executedByUserId,
    executedByUser: toAssignmentUserDto(assignment.executedByUser),
    status: assignment.status,
    configurationVersion: assignment.configurationVersion,
    rosterVersion: assignment.rosterVersion,
    evidencePolicy: assignment.evidencePolicy,
    origin: assignment.origin,
    isLocked: assignment.isLocked,
    resolutionNotes: assignment.resolutionNotes,
    coverageStart: formatDateOnly(coverage.coverageStart),
    coverageEnd: formatDateOnly(coverage.coverageEnd),
    coverageLabel: coverage.coverageLabel,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
    swapRequests: assignment.swapRequests.map(request => ({
      id: request.id,
      assignmentId: request.assignmentId,
      requesterUserId: request.requesterUserId,
      requesterUser: toAssignmentUserDto(request.requesterUser),
      targetUserId: request.targetUserId,
      targetUser: toAssignmentUserDto(request.targetUser),
      status: request.status,
      reason: request.reason,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    })),
    evidences: assignment.evidences.map(evidence => ({
      id: evidence.id,
      assignmentId: evidence.assignmentId,
      submittedById: evidence.submittedById,
      originalName: evidence.originalName,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      contentUrl: `/duty-rotations/assignments/${assignment.id}/evidences/${evidence.id}/content`,
      createdAt: evidence.createdAt.toISOString(),
    })),
  };

  return dutyAssignmentDtoSchema.parse(dto);
};

export const toDutyAssignmentDtos = (
  assignments: DutyAssignmentPayload[]
): DutyAssignmentDto[] => assignments.map(toDutyAssignmentDto);
