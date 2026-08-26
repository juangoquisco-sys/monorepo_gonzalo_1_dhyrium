import type { Level, SubTask } from '@/types/types';
import type { Commitment } from '../../types/officeMeetings.types';

export type TechnicalTaskParticipant = {
  userId: number;
  percentage: number;
  isPrimary: boolean;
  isActive: boolean;
};

export type ProjectTechnicalTask = {
  id: string;
  title: string;
  code: string;
  status: string;
  statusLabel: string;
  percentage?: number | null;
  projectId: number;
  stageId: number;
  stageName: string;
  levelId: number;
  levelPathIds: number[];
  taskId: number;
  participants: TechnicalTaskParticipant[];
};

type TaskInput = {
  projectId: number;
  stageId: number;
  stageName: string;
  statusLabel: (status?: string) => string;
};

const unique = <T>(values: T[]) => Array.from(new Set(values));

const getTaskParticipants = (task: SubTask): TechnicalTaskParticipant[] => {
  const participants = new Map<number, TechnicalTaskParticipant>();
  (task.meetingParticipants ?? []).forEach(participant => {
    participants.set(participant.userId, {
      userId: participant.userId,
      percentage: participant.percentage || 0,
      isPrimary: participant.isPrimary,
      isActive: participant.isActive,
    });
  });

  if (participants.size) return Array.from(participants.values());

  (task.users?.ACTIVE ?? []).forEach(participant => {
    if (!participant.user?.id) return;
    participants.set(participant.user.id, {
      userId: participant.user.id,
      percentage: participant.percentage || 0,
      isPrimary: true,
      isActive: Boolean(participant.status),
    });
  });
  (task.participantSummary ?? []).forEach(participant => {
    if (participants.has(participant.userId)) return;
    participants.set(participant.userId, {
      userId: participant.userId,
      percentage: 0,
      isPrimary: false,
      isActive: false,
    });
  });
  return Array.from(participants.values());
};

export const collectProjectTechnicalTasks = (
  level: Level | null | undefined,
  input: TaskInput,
  parentLevelIds: number[] = []
): ProjectTechnicalTask[] => {
  if (!level) return [];
  const levelPathIds = [...parentLevelIds, level.id];
  const directTasks = (level.subTasks ?? []).map(task => ({
    id: `task-${input.stageId}-${task.id}`,
    title: task.name,
    code: task.item || level.item || `T-${task.id}`,
    status: String(task.status || 'UNRESOLVED'),
    percentage: task.percentage,
    projectId: input.projectId,
    stageId: input.stageId,
    stageName: input.stageName,
    levelId: level.id,
    levelPathIds,
    taskId: task.id,
    participants: getTaskParticipants(task),
    statusLabel: input.statusLabel(String(task.status || 'UNRESOLVED')),
  }));
  return [
    ...directTasks,
    ...(level.nextLevel ?? []).flatMap(child =>
      collectProjectTechnicalTasks(child, input, levelPathIds)
    ),
  ];
};

export const getCommitmentMemberIds = (commitment: Commitment) =>
  unique(
    (commitment.assignees ?? []).flatMap(assignee =>
      assignee.user?.id ? [assignee.user.id] : []
    )
  );

export const commitmentCoversTask = (
  commitment: Commitment,
  task: ProjectTechnicalTask
) =>
  (commitment.contexts ?? []).some(context => {
    if (!['LEVEL', 'TASK'].includes(context.targetType)) return false;
    if (context.projectId && context.projectId !== task.projectId) return false;
    if (context.stageId && context.stageId !== task.stageId) return false;
    if (context.targetType === 'TASK') return context.subTaskId === task.taskId;
    if (!context.levelId) return false;
    return context.includeChildren
      ? task.levelPathIds.includes(context.levelId)
      : context.levelId === task.levelId;
  });

export const commitmentScopeTasks = (
  commitment: Commitment,
  tasks: ProjectTechnicalTask[]
) => tasks.filter(task => commitmentCoversTask(commitment, task));

export const commitmentScopeLevels = (
  commitment: Commitment,
  projectId: number,
  stageId: number
) => {
  const levels = new Map<number, string>();
  (commitment.contexts ?? []).forEach(context => {
    if (context.targetType !== 'LEVEL' || !context.levelId) return;
    if (context.projectId && context.projectId !== projectId) return;
    if (context.stageId && context.stageId !== stageId) return;
    const label = `${context.level?.item || ''} ${
      context.level?.name || 'Nivel'
    }`.trim();
    levels.set(context.levelId, label);
  });
  return Array.from(levels, ([id, label]) => ({ id, label }));
};

export const isUnlinkedTechnicalAdvance = (
  task: ProjectTechnicalTask,
  commitments: Commitment[]
) =>
  task.status !== 'UNRESOLVED' &&
  !commitments.some(commitment => commitmentCoversTask(commitment, task));

export const taskParticipantIds = (task: ProjectTechnicalTask) =>
  task.participants.map(participant => participant.userId);
