import type { UserType } from '@/middlewares/auth.middleware';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import type { TaskDocumentKind } from './taskDocuments.schema';
import {
  allowsHistoricalTaskDocumentAssignment,
  hasTaskDocumentAccess,
  type TaskDocumentAccess,
} from './taskDocumentOffice.policy.domain';

class TaskDocumentOfficePolicy {
  private static async assertCanAccess(
    user: UserType,
    taskKind: TaskDocumentKind,
    taskId: number,
    access: TaskDocumentAccess
  ) {
    const hasGlobalAccess = hasTaskDocumentAccess(user, false);
    if (hasGlobalAccess) return;

    const contextualAssignment =
      taskKind === 'subtasks'
        ? await prisma.subTasks.findFirst({
            where: {
              id: taskId,
              OR: [
                { mods: { some: { id: user.id } } },
                { users: { some: { userId: user.id } } },
                ...(allowsHistoricalTaskDocumentAssignment(access)
                  ? [{ usersold: { some: { userId: user.id } } }]
                  : []),
                { Levels: { userId: user.id } },
                { Levels: { stages: { moderatorId: user.id } } },
              ],
            },
            select: { id: true },
          })
        : await prisma.basicTasks.findFirst({
            where: {
              id: taskId,
              OR: [
                { mods: { some: { id: user.id } } },
                { users: { some: { userId: user.id } } },
              ],
            },
            select: { id: true },
          });

    if (!hasTaskDocumentAccess(user, Boolean(contextualAssignment))) {
      const isRead = access === 'read';
      throw new AppError(
        isRead
          ? 'No tiene permiso para consultar el documento de esta tarea.'
          : 'No tiene permiso para editar el documento de esta tarea.',
        403,
        isRead ? 'TASK_DOCUMENT_READ_FORBIDDEN' : 'TASK_DOCUMENT_EDIT_FORBIDDEN'
      );
    }
  }

  static async assertCanRead(
    user: UserType,
    taskKind: TaskDocumentKind,
    taskId: number
  ) {
    await this.assertCanAccess(user, taskKind, taskId, 'read');
  }

  static async assertCanEdit(
    user: UserType,
    taskKind: TaskDocumentKind,
    taskId: number
  ) {
    await this.assertCanAccess(user, taskKind, taskId, 'edit');
  }
}

export default TaskDocumentOfficePolicy;
