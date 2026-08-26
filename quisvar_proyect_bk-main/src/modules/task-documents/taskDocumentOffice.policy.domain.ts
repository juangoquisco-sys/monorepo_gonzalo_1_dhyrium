import type { UserType } from '@/middlewares/auth.middleware';

export type TaskDocumentAccess = 'read' | 'edit';

export const hasProjectWriteRole = (user: Pick<UserType, 'role'>) =>
  user.role.menuPoints.some(
    point => point.route === 'especialidades' && point.typeRol === 'MOD'
  );

export const hasTaskDocumentAccess = (
  user: Pick<UserType, 'role'>,
  hasContextualAssignment: boolean
) => hasProjectWriteRole(user) || hasContextualAssignment;

export const allowsHistoricalTaskDocumentAssignment = (
  access: TaskDocumentAccess
) => access === 'read';
