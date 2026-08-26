import type { Level, ParticipantSummary, SubTask } from '@/types/types';

const legacyParticipantSummaryKey = ['list', 'Users'].join('');

type ParticipantSummaryContainer = {
  participantSummary?: ParticipantSummary[];
};

const isParticipantSummary = (value: unknown): value is ParticipantSummary => {
  if (typeof value !== 'object' || value === null) return false;

  const participant: object = value;
  return (
    typeof Reflect.get(participant, 'userId') === 'number' &&
    typeof Reflect.get(participant, 'count') === 'number' &&
    typeof Reflect.get(participant, 'firstName') === 'string' &&
    typeof Reflect.get(participant, 'lastName') === 'string' &&
    typeof Reflect.get(participant, 'dni') === 'string'
  );
};

const isParticipantSummaryList = (
  value: unknown
): value is ParticipantSummary[] =>
  Array.isArray(value) &&
  value.every((participant: unknown) => isParticipantSummary(participant));

export const getParticipantSummary = (
  value?: ParticipantSummaryContainer | null
): ParticipantSummary[] => {
  if (!value) return [];

  if (value.participantSummary) return value.participantSummary;

  const legacyParticipantSummary: unknown = Reflect.get(
    value,
    legacyParticipantSummaryKey
  );
  return isParticipantSummaryList(legacyParticipantSummary)
    ? legacyParticipantSummary
    : [];
};

const normalizeSubTask = (subTask: SubTask): SubTask => ({
  ...subTask,
  participantSummary: getParticipantSummary(subTask),
});

export const normalizeProjectLevel = (level: Level): Level => ({
  ...level,
  participantSummary: getParticipantSummary(level),
  subTasks: level.subTasks?.map(normalizeSubTask) ?? [],
  nextLevel: level.nextLevel?.map(normalizeProjectLevel),
});
