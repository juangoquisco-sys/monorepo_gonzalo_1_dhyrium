import { Socket, Server as WebSocketServer } from 'socket.io';
import { CatchAsync } from '@/types/types';
import BasicTaskOnUserServices from '@/services/basictaskOnUsers.services';
import BasicTasksServices from '@/services/basictask.services';
import FeedbackBasicServices from '@/services/feedback-basic.services';
import StageServices from '@/services/stages.services';
import { BasicFeedback, BasicTaskOnUsers } from '@prisma/client';

interface TaskBasic {
  userId: number;
  taskId: BasicTaskOnUsers['taskId'];
  stageId?: string;
}
const budgetSocketCotroller = (
  socket: Socket,
  io: WebSocketServer,
  catchAsyncSocket?: CatchAsync
) => {
  const emitStage = async (stageId: string) => {
    const query = await StageServices.findBasics(+stageId);
    io?.to(`basic-${stageId}`).emit('server:basic-load-stage', query);
  };

  const emitBasicTask = async (taskId: number) => {
    const query = await BasicTasksServices.find(+taskId);
    io?.to(`basic-task-${taskId}`).emit('server:load-basic-task', query);
  };

  if (!catchAsyncSocket) return;
  socket.on(
    'client:load-basic-task',
    catchAsyncSocket(
      async ({ taskId, stageId }: TaskBasic, callback: Function) => {
        await emitBasicTask(taskId);
        stageId && emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:add-user-basic-task',
    catchAsyncSocket(
      async ({ taskId, userId, stageId }: TaskBasic, callback: Function) => {
        await BasicTaskOnUserServices.add({ taskId, userId });
        await emitBasicTask(taskId);
        stageId && emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:add-mod-basic-task',
    catchAsyncSocket(
      async ({ taskId, userId }: TaskBasic, callback: Function) => {
        await BasicTaskOnUserServices.addMod({ taskId, userId });
        await emitBasicTask(taskId);
        callback();
      }
    )
  );
  socket.on(
    'client:remove-mod-basic-task',
    catchAsyncSocket(
      async ({ taskId, userId }: TaskBasic, callback: Function) => {
        await BasicTaskOnUserServices.removeMod({
          taskId,
          userId,
        });
        await emitBasicTask(taskId);
        callback();
      }
    )
  );
  socket.on(
    'client:review-basic-task',
    catchAsyncSocket(
      async (
        taskId: number,
        body: BasicFeedback & { userOnTaskId: number },
        callback: Function
      ) => {
        const { user } = socket.data;
        await FeedbackBasicServices.review(body, user);
        await emitBasicTask(taskId);
        callback();
      }
    )
  );
  socket.on(
    'client:restore-basic-task',
    catchAsyncSocket(async (taskId: number, callback: Function) => {
      console.log('entre asqui', taskId);
      await BasicTasksServices.restore(+taskId);
      await emitBasicTask(taskId);
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
