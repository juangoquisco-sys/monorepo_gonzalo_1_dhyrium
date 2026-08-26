import type { DutySlot } from '@/services/rotations/duty.schema';

export interface DutyAllocationParticipant {
  id: number;
  position: number;
}

export interface DutyAllocationHistoryItem {
  baseSlotKey: string;
  assignedUserId: number;
}

export interface DutyAllocationPosition {
  slotKey: string;
  slotLabel: string;
  slotInstructions: string | null;
  baseSlotKey: string;
  slotPosition: number;
  assignedUserId: number;
}

export interface DutyAllocationResult {
  assignments: DutyAllocationPosition[];
  repeatedGroupCount: number;
  warnings: string[];
}

export interface DutyFixedAllocation {
  slotKey: string;
  assignedUserId: number;
}

interface ExpandedPosition {
  key: string;
  label: string;
  instructions: string | null;
  baseSlotKey: string;
  slotPosition: number;
  eligibleParticipantIds: Set<number> | null;
}

export class DutyAllocationError extends Error {}

const compareText = (first: string, second: string) =>
  first.localeCompare(second, 'en');

class DutyAllocationPolicy {
  static expandPositions(slots: DutySlot[], participantCount: number) {
    const remainderSlots = slots.filter(
      slot => slot.capacity?.mode === 'REMAINDER'
    );
    if (remainderSlots.length !== 1) {
      throw new DutyAllocationError(
        'La distribucion requiere exactamente un grupo para el personal restante'
      );
    }
    const fixedCount = slots.reduce(
      (total, slot) =>
        total + (slot.capacity?.mode === 'FIXED' ? slot.capacity.count : 0),
      0
    );
    if (fixedCount > participantCount) {
      throw new DutyAllocationError(
        'No hay suficientes participantes para cubrir los cupos fijos'
      );
    }

    return slots.flatMap(slot => {
      if (!slot.capacity) {
        throw new DutyAllocationError(`El grupo ${slot.label} no tiene cupo`);
      }
      const count =
        slot.capacity.mode === 'FIXED'
          ? slot.capacity.count
          : participantCount - fixedCount;
      const eligibleParticipantIds = slot.eligibleParticipantIds?.length
        ? new Set(slot.eligibleParticipantIds)
        : null;
      return Array.from(
        { length: count },
        (_, index): ExpandedPosition => ({
          key: `${slot.key}:${String(index + 1).padStart(3, '0')}`,
          label: slot.label,
          instructions: slot.instructions ?? null,
          baseSlotKey: slot.key,
          slotPosition: index + 1,
          eligibleParticipantIds,
        })
      );
    });
  }

  static allocate(
    slots: DutySlot[],
    participants: DutyAllocationParticipant[],
    history: DutyAllocationHistoryItem[] = [],
    fixedAllocations: DutyFixedAllocation[] = []
  ): DutyAllocationResult {
    if (!participants.length) {
      throw new DutyAllocationError(
        'La actividad no tiene participantes disponibles para esta ocurrencia'
      );
    }
    const positions = this.expandPositions(slots, participants.length);
    if (positions.length !== participants.length) {
      throw new DutyAllocationError(
        'Cada participante debe tener exactamente una posicion en la jornada'
      );
    }

    const participantById = new Map(
      participants.map(participant => [participant.id, participant])
    );
    const groupCounts = new Map<string, number>();
    const previousGroup = new Map<number, string>();
    history.forEach(item => {
      groupCounts.set(
        `${item.assignedUserId}:${item.baseSlotKey}`,
        (groupCounts.get(`${item.assignedUserId}:${item.baseSlotKey}`) ?? 0) + 1
      );
      previousGroup.set(item.assignedUserId, item.baseSlotKey);
    });

    const candidatesFor = (position: ExpandedPosition) =>
      participants
        .filter(
          participant =>
            !position.eligibleParticipantIds ||
            position.eligibleParticipantIds.has(participant.id)
        )
        .sort((first, second) => {
          const firstRepeated =
            previousGroup.get(first.id) === position.baseSlotKey ? 1 : 0;
          const secondRepeated =
            previousGroup.get(second.id) === position.baseSlotKey ? 1 : 0;
          if (firstRepeated !== secondRepeated)
            return firstRepeated - secondRepeated;
          const firstCount =
            groupCounts.get(`${first.id}:${position.baseSlotKey}`) ?? 0;
          const secondCount =
            groupCounts.get(`${second.id}:${position.baseSlotKey}`) ?? 0;
          if (firstCount !== secondCount) return firstCount - secondCount;
          if (first.position !== second.position)
            return first.position - second.position;
          return first.id - second.id;
        });

    const candidateIdsByPosition = new Map(
      positions.map(position => [
        position.key,
        candidatesFor(position).map(participant => participant.id),
      ])
    );
    const orderedPositions = [...positions].sort((first, second) => {
      const countDifference =
        (candidateIdsByPosition.get(first.key)?.length ?? 0) -
        (candidateIdsByPosition.get(second.key)?.length ?? 0);
      return countDifference || compareText(first.key, second.key);
    });
    const positionByKey = new Map(
      positions.map(position => [position.key, position])
    );
    const fixedPositionKeys = new Set<string>();
    const fixedParticipantIds = new Set<number>();
    const validFixedAllocations: DutyFixedAllocation[] = [];
    fixedAllocations.forEach(fixed => {
      if (!positionByKey.has(fixed.slotKey)) return;
      if (!participantById.has(fixed.assignedUserId)) {
        throw new DutyAllocationError(
          'Una asignacion protegida pertenece a un participante no disponible'
        );
      }
      if (fixedParticipantIds.has(fixed.assignedUserId)) {
        throw new DutyAllocationError(
          'Las asignaciones protegidas repiten un participante en la misma ocurrencia'
        );
      }
      fixedPositionKeys.add(fixed.slotKey);
      fixedParticipantIds.add(fixed.assignedUserId);
      validFixedAllocations.push(fixed);
    });

    const findMatching = (avoidRepeatedGroups: boolean) => {
      const participantForPosition = new Map<string, number>();
      const positionForParticipant = new Map<number, string>();
      validFixedAllocations.forEach(fixed => {
        participantForPosition.set(fixed.slotKey, fixed.assignedUserId);
        positionForParticipant.set(fixed.assignedUserId, fixed.slotKey);
      });

      const assign = (
        positionKey: string,
        visitedParticipants: Set<number>,
        visitedPositions: Set<string>
      ): boolean => {
        if (fixedPositionKeys.has(positionKey)) return false;
        if (visitedPositions.has(positionKey)) return false;
        visitedPositions.add(positionKey);
        const position = positionByKey.get(positionKey);
        for (const participantId of candidateIdsByPosition.get(positionKey) ??
          []) {
          if (
            avoidRepeatedGroups &&
            position &&
            previousGroup.get(participantId) === position.baseSlotKey
          ) {
            continue;
          }
          if (visitedParticipants.has(participantId)) continue;
          visitedParticipants.add(participantId);
          const previousPositionKey = positionForParticipant.get(participantId);
          if (
            !previousPositionKey ||
            assign(previousPositionKey, visitedParticipants, visitedPositions)
          ) {
            participantForPosition.set(positionKey, participantId);
            positionForParticipant.set(participantId, positionKey);
            return true;
          }
        }
        return false;
      };

      for (const position of orderedPositions) {
        if (fixedPositionKeys.has(position.key)) continue;
        if (!assign(position.key, new Set(), new Set())) return null;
      }
      return participantForPosition;
    };

    const participantForPosition = findMatching(true) ?? findMatching(false);
    if (!participantForPosition) {
      throw new DutyAllocationError(
        'No existe una distribucion valida para los grupos configurados'
      );
    }

    const assignments = positions
      .map(position => {
        const assignedUserId = participantForPosition.get(position.key);
        if (!assignedUserId || !participantById.has(assignedUserId)) {
          throw new DutyAllocationError(
            'No se pudo completar la distribucion de participantes'
          );
        }
        return {
          slotKey: position.key,
          slotLabel: position.label,
          slotInstructions: position.instructions,
          baseSlotKey: position.baseSlotKey,
          slotPosition: position.slotPosition,
          assignedUserId,
        };
      })
      .sort((first, second) => compareText(first.slotKey, second.slotKey));
    const repeatedGroupCount = assignments.filter(
      assignment =>
        previousGroup.get(assignment.assignedUserId) === assignment.baseSlotKey
    ).length;
    return {
      assignments,
      repeatedGroupCount,
      warnings: repeatedGroupCount
        ? [
            `${repeatedGroupCount} participante(s) repiten zona porque no fue posible evitar todas las repeticiones en una distribucion completa.`,
          ]
        : [],
    };
  }
}

export default DutyAllocationPolicy;
