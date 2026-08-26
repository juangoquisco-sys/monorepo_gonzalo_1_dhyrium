import type {
  DutyRotationAssignment,
  DutyUser,
} from './models/dutyRotations.types';

interface DutyPlanningZone {
  key: string;
  label: string;
  instructions: string | null;
  assignments: DutyRotationAssignment[];
}

export interface DutyPlanningOccurrence {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  assignments: DutyRotationAssignment[];
  zones: DutyPlanningZone[];
}

const compareAssignments = (
  first: DutyRotationAssignment,
  second: DutyRotationAssignment
) =>
  (first.slotPosition ?? Number.MAX_SAFE_INTEGER) -
    (second.slotPosition ?? Number.MAX_SAFE_INTEGER) ||
  first.slotLabel.localeCompare(second.slotLabel, 'es');

export const groupDutyPlanningAssignments = (
  assignments: DutyRotationAssignment[]
): DutyPlanningOccurrence[] => {
  const grouped = new Map<string, DutyRotationAssignment[]>();

  assignments.forEach(assignment => {
    const occurrenceAssignments = grouped.get(assignment.occurrenceKey);
    if (occurrenceAssignments) occurrenceAssignments.push(assignment);
    else grouped.set(assignment.occurrenceKey, [assignment]);
  });

  return Array.from(grouped.entries())
    .map(([occurrenceKey, occurrenceAssignments]) => {
      const sortedAssignments = [...occurrenceAssignments].sort(
        compareAssignments
      );
      const first = sortedAssignments[0];
      const zones = new Map<string, DutyPlanningZone>();

      sortedAssignments.forEach(assignment => {
        const baseZoneKey = assignment.baseSlotKey ?? assignment.slotKey;
        const zoneKey = `${baseZoneKey}\u0000${
          assignment.slotInstructions ?? ''
        }`;
        const existingZone = zones.get(zoneKey);
        if (existingZone) {
          existingZone.assignments.push(assignment);
          return;
        }
        zones.set(zoneKey, {
          key: zoneKey,
          label: assignment.slotLabel,
          instructions: assignment.slotInstructions,
          assignments: [assignment],
        });
      });

      return {
        occurrenceKey,
        periodStart: first.periodStart,
        periodEnd: first.periodEnd,
        dueOn: first.dueOn,
        assignments: sortedAssignments,
        zones: Array.from(zones.values()),
      };
    })
    .sort(
      (first, second) =>
        first.periodStart.localeCompare(second.periodStart) ||
        first.occurrenceKey.localeCompare(second.occurrenceKey)
    );
};

export const getShareableDutyUserName = (user?: DutyUser | null) => {
  const firstName = user?.profile?.firstName?.trim() ?? '';
  const lastName = user?.profile?.lastName?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || null;
};
