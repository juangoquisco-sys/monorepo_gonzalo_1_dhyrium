import type {
  CommitmentAssigneeRole,
  CommitmentTargetType,
} from '@prisma/client';

export type CommitmentAssigneeSelection = {
  userId?: number;
  unitId?: string;
  role?: CommitmentAssigneeRole;
};

export type CommitmentContextSelection = {
  targetType: CommitmentTargetType;
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
  levelId?: number | null;
  subTaskId?: number | null;
  includeChildren: boolean;
  isPrimary: boolean;
};

export const canonicalizeCommitmentAssignees = (
  assignees: CommitmentAssigneeSelection[]
) => {
  const seen = new Set<string>();
  return assignees.filter(assignee => {
    const key = assignee.userId
      ? `USER:${assignee.userId}`
      : assignee.unitId
      ? `UNIT:${assignee.unitId}`
      : '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const contextKey = (context: CommitmentContextSelection) => {
  if (context.targetType === 'ORG_UNIT') return `ORG_UNIT:${context.unitId}`;
  if (context.targetType === 'PROJECT') return `PROJECT:${context.projectId}`;
  if (context.targetType === 'STAGE') return `STAGE:${context.stageId}`;
  if (context.targetType === 'LEVEL') return `LEVEL:${context.levelId}`;
  return `TASK:${context.subTaskId}`;
};

export const canonicalizeCommitmentContexts = (
  contexts: CommitmentContextSelection[]
) => {
  const seen = new Set<string>();
  const unique = contexts.filter(context => {
    const key = contextKey(context);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.map((context, index) => ({
    ...context,
    isPrimary: index === 0,
  }));
};
