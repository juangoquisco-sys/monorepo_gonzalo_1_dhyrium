import { Socket, Server as WebSocketServer } from 'socket.io';
import { CatchAsync } from '@/types/types';
import SubTasksServices from '@/services/subtasks.services';
import FeedbackServices from '@/services/feedbacks.services';
import StageServices from '@/services/stages.services';
import TaskOnUsersServices from '@/services/taskOnUsers.services';
import { ReviewFeedbackForm } from '@/types/feedback';

interface TaskBudget {
  userId: number;
  taskId: number;
  stageId?: string;
}
const budgetSocketCotroller = (
  socket: Socket,
  io: WebSocketServer,
  catchAsyncSocket?: CatchAsync
) => {
  const emitStage = async (stageId: string) => {
    const query = await StageServices.find(+stageId);
    io?.to(`budget-${stageId}`).emit('server:budget-load-stage', query);
  };
  const emitBudgetTask = async (taskId: number) => {
    const query = await SubTasksServices.find(+taskId);
    io?.to(`budget-task-${taskId}`).emit('server:load-budget-task', query);
  };

  if (!catchAsyncSocket) return;
  socket.on(
    'client:load-budget-task',
    catchAsyncSocket(
      async ({ taskId, stageId }: TaskBudget, callback: Function) => {
        await emitBudgetTask(taskId);
        stageId && emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:add-user-budget-task',
    catchAsyncSocket(
      async ({ taskId, userId, stageId }: TaskBudget, callback: Function) => {
        await TaskOnUsersServices.add({ taskId, userId });
        await emitBudgetTask(taskId);
        stageId && emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:change-user-budget-task',
    catchAsyncSocket(
      async ({ taskId, userId, stageId }: TaskBudget, callback: Function) => {
        await TaskOnUsersServices.updateUser({ taskId, userId });
        await emitBudgetTask(taskId);
        stageId && emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:add-mod-budget-task',
    catchAsyncSocket(
      async ({ taskId, userId }: TaskBudget, callback: Function) => {
        console.log({ taskId, userId });
        await TaskOnUsersServices.addMod({ taskId, userId });
        await emitBudgetTask(taskId);
        callback();
      }
    )
  );
  socket.on(
    'client:remove-mod-budget-task',
    catchAsyncSocket(
      async ({ taskId, userId }: TaskBudget, callback: Function) => {
        await TaskOnUsersServices.removeMod({
          taskId,
          userId,
        });
        await emitBudgetTask(taskId);
        callback();
      }
    )
  );
  socket.on(
    'client:review-budget-task',
    catchAsyncSocket(
      async (
        { taskId, stageId }: TaskBudget,
        body: ReviewFeedbackForm,
        callback: Function
      ) => {
        const { user } = socket.data;
        await FeedbackServices.review(body, user);
        await emitBudgetTask(taskId);
        stageId && emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:restore-budget-task',
    catchAsyncSocket(async (taskId: number, callback: Function) => {
      await SubTasksServices.restore(+taskId);
      await emitBudgetTask(taskId);
      callback();
    })
  );

  // socket.on(
  //   'client:add-task-budget',
  //   catchAsyncSocket(
  //     async ({ stageId, ...body }: TaskStage, callback: Function) => {
  //       await SubTasksServices.create(body);
  //       await emitStage(stageId);
  //       callback();
  //     }
  //   )
  // );
  // socket.on(
  //   'client:edit-task-budget',
  //   catchAsyncSocket(
  //     async ({ stageId, id, ...body }: TaskStage, callback: Function) => {
  //       await SubTasksServices.update(+id, body);
  //       await emitStage(stageId);
  //       callback();
  //     }
  //   )
  // );
  // socket.on(
  //   'client:delete-task-budget',
  //   catchAsyncSocket(async ({ stageId, id }: TaskStage, callback: Function) => {
  //     await SubTasksServices.delete(+id);
  //     await emitStage(stageId);
  //     callback();
  //   })
  // );
  // socket.on(
  //   'client:duplicate-task-budget',
  //   catchAsyncSocket(
  //     async ({ stageId, id, name }: TaskStage, callback: Function) => {
  //       await DuplicatesServices.subTask(id, name);
  //       await emitStage(stageId);
  //       callback();
  //     }
  //   )
  // );
  // socket.on(
  //   'client:upper-or-lower-task-budget',
  //   catchAsyncSocket(
  //     async (
  //       { stageId, id, description, name, days }: TaskStage,
  //       typeGte: 'upper' | 'lower',
  //       callback: Function
  //     ) => {
  //       const body = { description: description ?? '', name, days };
  //       await SubTasksServices.addToUper(+id, body, typeGte);
  //       await emitStage(stageId);
  //       callback();
  //     }
  //   )
  // );
};

export default budgetSocketCotroller;
