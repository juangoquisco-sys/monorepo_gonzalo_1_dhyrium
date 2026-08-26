import { Socket, Server as WebSocketServer } from 'socket.io';
import { CatchAsync } from '@/types/types';
import DuplicatesServices from '@/services/duplicates.services';
import LevelsServices from '@/services/levels.services';
import StageServices from '@/services/stages.services';
import SubTasksServices from '@/services/subtasks.services';
import { Levels, SubTasks } from '@prisma/client';
import { SortingListType, UpdateTaskDays } from '@/types/task';

type TaskStage = SubTasks & { stageId: number };

const budgetSocketCotroller = (
  socket: Socket,
  io: WebSocketServer,
  catchAsyncSocket?: CatchAsync
) => {
  const emitStage = async (stageId: number) => {
    const query = await StageServices.find(+stageId);
    io?.to(`budget-${stageId}`).emit('server:budget-load-stage', query);
  };
  if (!catchAsyncSocket) return;

  socket.on(
    'client:budget-add-level',
    catchAsyncSocket(
      async (
        { withTask, ...data }: Levels & { withTask: boolean },
        callback: Function
      ) => {
        const query = await LevelsServices.create(data, { withTask });
        await emitStage(query.stagesId);
        callback();
      }
    )
  );
  socket.on(
    'client:get-stage-content',
    catchAsyncSocket(async (id: number, callback: Function) => {
      await emitStage(id);
      callback();
    })
  );

  socket.on(
    'client:budget-delete-level',
    catchAsyncSocket(async (levelId: number, callback: Function) => {
      const query = await LevelsServices.delete(+levelId);
      await emitStage(query.deleteLevel.stagesId);
      callback();
    })
  );
  socket.on(
    'client:budget-edit-level',
    catchAsyncSocket(
      async (levelId: number, body: Levels, callback: Function) => {
        const query = await LevelsServices.update(+levelId, body);
        await emitStage(query.stagesId);
        callback();
      }
    )
  );
  socket.on(
    'client:budget-make-regular-level',
    catchAsyncSocket(async (levelId: number, callback: Function) => {
      const query = await LevelsServices.makeRegularFolder(+levelId);
      await emitStage(query.stagesId);
      callback();
    })
  );
  socket.on(
    'client:budget-upper-or-lower-level',
    catchAsyncSocket(
      async (
        levelId: number,
        body: Levels,
        typeGte: 'upper' | 'lower',
        callback: Function
      ) => {
        const { newLevel } = await LevelsServices.addToUpperorLower(
          levelId,
          body,
          typeGte
        );
        await emitStage(newLevel.stagesId);
        callback();
      }
    )
  );
  socket.on(
    'client:update-cover-budget',
    catchAsyncSocket(
      async (
        data: { id: number; cover: boolean }[],
        stageId: number,
        callback: Function
      ) => {
        await LevelsServices.updateCovers(data);
        await emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:budget-duplicates-level',
    catchAsyncSocket(
      async (levelId: number, name: string, callback: Function) => {
        const query = await DuplicatesServices.level(+levelId, name);
        await emitStage(query.stagesId);
        callback();
      }
    )
  );

  socket.on(
    'client:add-task-budget',
    catchAsyncSocket(
      async ({ stageId, ...body }: TaskStage, callback: Function) => {
        await SubTasksServices.create(body);
        await emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:edit-task-budget',
    catchAsyncSocket(
      async ({ stageId, id, ...body }: TaskStage, callback: Function) => {
        await SubTasksServices.update(+id, body);
        await emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:sort-task-budget',
    catchAsyncSocket(
      async (stageId: number, body: SortingListType[], callback: Function) => {
        await SubTasksServices.sorting(body);
        await emitStage(stageId);
        callback();
      }
    )
  );

  socket.on(
    'client:update-task-days-budget',
    catchAsyncSocket(
      async (
        data: {
          stageId: number;
          tasks: UpdateTaskDays[];
          monthlyPrice?: number;
          stayPrice?: number;
        },
        callback: Function
      ) => {
        await SubTasksServices.updateDays(data);
        await emitStage(data.stageId);
        callback();
      }
    )
  );

  socket.on(
    'client:duplicate-task-budget',
    catchAsyncSocket(
      async ({ stageId, id, name }: TaskStage, callback: Function) => {
        await DuplicatesServices.subTask(id, name);
        await emitStage(stageId);
        callback();
      }
    )
  );
  socket.on(
    'client:delete-task-budget',
    catchAsyncSocket(async ({ stageId, id }: TaskStage, callback: Function) => {
      await SubTasksServices.delete(+id);
      await emitStage(stageId);
      callback();
    })
  );
  socket.on(
    'client:upper-or-lower-task-budget',
    catchAsyncSocket(
      async (
        { stageId, id, name, days }: TaskStage,
        typeGte: 'upper' | 'lower',
        callback: Function
      ) => {
        const body = { name, days };
        await SubTasksServices.addToUpperorLower(+id, body, typeGte);
        await emitStage(stageId);
        callback();
      }
    )
  );
};

export default budgetSocketCotroller;
