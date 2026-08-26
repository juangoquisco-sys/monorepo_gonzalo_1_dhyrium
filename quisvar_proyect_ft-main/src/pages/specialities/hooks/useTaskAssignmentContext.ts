import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { UserSelect } from '../models/taskGroupUser.types';

type ContextUser = {
  id: number;
  email?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    dni?: string | null;
    description?: string | null;
  } | null;
};

type AssignmentContextResponse = {
  source: 'UNIT' | 'LEGACY_GROUP';
  migrationRequired: boolean;
  unit?: {
    id: string;
    name: string;
    type: string;
    codemap?: string | null;
  } | null;
  legacyGroup?: { id: number; name: string } | null;
  members: ContextUser[];
  evaluators: ContextUser[];
  allActiveUsers: ContextUser[];
};

export type TaskAssignmentContext = Omit<
  AssignmentContextResponse,
  'members' | 'evaluators' | 'allActiveUsers'
> & {
  members: UserSelect[];
  evaluators: UserSelect[];
  allActiveUsers: UserSelect[];
};

const toUserSelect = (user: ContextUser): UserSelect => {
  const name = [user.profile?.firstName, user.profile?.lastName]
    .filter(Boolean)
    .join(' ');
  return {
    id: user.id,
    value: String(user.id),
    label: name || user.email || `Usuario ${user.id}`,
    description: user.profile?.description || '',
    dni: user.profile?.dni || '',
  };
};

export const useTaskAssignmentContext = (
  taskId: number | null | undefined,
  kind: 'TECHNICAL' | 'BASIC'
) =>
  useQuery({
    queryKey: ['task-assignment-context', kind, taskId],
    enabled: Boolean(taskId),
    queryFn: async (): Promise<TaskAssignmentContext> => {
      const basePath = kind === 'BASIC' ? '/basictasks' : '/subtasks';
      const { data } = await axiosInstance.get<AssignmentContextResponse>(
        `${basePath}/${taskId}/assignment-context`,
        { headers: { noLoader: true } }
      );
      return {
        ...data,
        members: data.members.map(toUserSelect),
        evaluators: data.evaluators.map(toUserSelect),
        allActiveUsers: data.allActiveUsers.map(toUserSelect),
      };
    },
  });
