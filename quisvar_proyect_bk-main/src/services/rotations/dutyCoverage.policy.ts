import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';

type PersistedAssignmentPeriod = {
  periodStart: Date;
  periodEnd: Date;
  dueOn: Date;
  slotLabel: string;
};

class DutyCoveragePolicy {
  static resolveAssignmentPeriod(assignment: PersistedAssignmentPeriod) {
    return {
      coverageStart: assignment.periodStart,
      coverageEnd: assignment.periodEnd,
      dueOn: assignment.dueOn,
      coverageLabel: this.formatCoverageLabel(assignment),
    };
  }

  private static formatCoverageLabel(assignment: PersistedAssignmentPeriod) {
    const start = DutyPlannerPolicy.formatDate(assignment.periodStart);
    const end = DutyPlannerPolicy.formatDate(assignment.periodEnd);
    return start === end
      ? `${start} - ${assignment.slotLabel}`
      : `${start} - ${end} - ${assignment.slotLabel}`;
  }
}

export default DutyCoveragePolicy;
