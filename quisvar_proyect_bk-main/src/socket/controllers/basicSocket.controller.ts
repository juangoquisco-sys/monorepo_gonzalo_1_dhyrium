import { Server as WebSocketServer, Socket } from 'socket.io';
import BasicLevelServices from '@/services/basiclevels.services';
import BasicTasksServices from '@/services/basictask.services';
import DuplicatesServices from '@/services/duplicates.services';
import StageServices from '@/services/stages.services';
import { BasicLevels, BasicTasks } from '@prisma/client';
import { CatchAsync } from '@/types/types';
import { SortingListType } from '@/types/task';

type TaskStage = BasicTasks & { stageId: number };

const basicSocketCotroller = (
  socket: Socket,
  io: WebSocketServer,
  catchAsyncSocket?: CatchAsync
) => {
  const emitStage = async (stageId: number) => {
    const query = await StageServices.findBasics(+stageId);
    io?.to(`basic-${stageId}`).emit('server:basic-load-stage', query);
  };

  if (catchAsyncSocket) {
    socket.on(
      'client:get-stage',
      catchAsyncSocket(async (stageId: number, callback: Function) => {
        const query = await StageServices.findBasics(+stageId);
        callback(query);
      })
    );
    socket.on(
      'client:load-stage',
      catchAsyncSocket(async (stageId: number, callback?: Function) => {
        console.log('stageId', stageId);
        await emitStage(stageId);
        callback?.();
      })
    );

    socket.on(
      'client:basic-add-level',
      catchAsyncSocket(async (data: BasicLevels, callback: Function) => {
        const query = await BasicLevelServices.create(data);
        await emitStage(query.stagesId);
        callback();
      })
    );

    socket.on(
      'client:basic-delete-level',
      catchAsyncSocket(async (levelId: number, callback: Function) => {
        const query = await BasicLevelServices.delete(+levelId);
        await emitStage(query.deleteLevel.stagesId);
        callback();
      })
    );

    socket.on(
      'client:basic-edit-level',
      catchAsyncSocket(
        async (levelId: number, body: BasicLevels, callback: Function) => {
          const query = await BasicLevelServices.update(+levelId, body);
          await emitStage(query.stagesId);
          callback();
        }
      )
    );
    socket.on(
      'client:basic-make-regular-level',
      catchAsyncSocket(async (levelId: number, callback: Function) => {
        const query = await BasicLevelServices.makeRegularFolder(+levelId);
        await emitStage(query.stagesId);
        callback();
      })
    );
    socket.on(
      'client:basic-upper-or-lower-level',
      catchAsyncSocket(
        async (
          levelId: number,
          body: BasicLevels,
          typeGte: 'upper' | 'lower',
          callback: Function
        ) => {
          const { newLevel } = await BasicLevelServices.addToUpperorLower(
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
      'client:update-cover-basic',
      catchAsyncSocket(
        async (
          data: { id: number; cover: boolean }[],
          stageId: number,
          callback: Function
        ) => {
          await BasicLevelServices.updateCovers(data);
          await emitStage(stageId);
          callback();
        }
      )
    );
    socket.on(
      'client:basic-duplicates-level',
      catchAsyncSocket(
        async (levelId: number, name: string, callback: Function) => {
          const query = await DuplicatesServices.basicLevel(+levelId, name);
          await emitStage(query.stagesId);
          callback();
        }
      )
    );

    socket.on(
      'client:add-task-basic',
      catchAsyncSocket(
        async ({ stageId, ...body }: TaskStage, callback: Function) => {
          await BasicTasksServices.create(body);
          await emitStage(stageId);
          callback();
        }
      )
    );

    socket.on(
      'client:edit-task-basic',
      catchAsyncSocket(
        async ({ stageId, id, ...body }: TaskStage, callback: Function) => {
          await BasicTasksServices.update(+id, body);
          await emitStage(stageId);
          callback();
        }
      )
    );
    socket.on(
      'client:sort-task-basic',
      catchAsyncSocket(
        async (
          stageId: number,
          body: SortingListType[],
          callback: Function
        ) => {
          await BasicTasksServices.sort(body);
          await emitStage(stageId);
          callback();
        }
      )
    );
    socket.on(
      'client:update-task-days-basic',
      catchAsyncSocket(
        async (
          data: { id: number; days: number }[],
          stageId: number,
          callback: Function
        ) => {
          await BasicLevelServices.updateDaysPerId(data);
          await emitStage(stageId);
          callback();
        }
      )
    );
    socket.on(
      'client:duplicate-task-basic',
      catchAsyncSocket(
        async ({ stageId, id, name }: TaskStage, callback: Function) => {
          // await DuplicatesServices.basicTask(id, name);
          await emitStage(stageId);
          callback();
        }
      )
    );
    socket.on(
      'client:delete-task-basic',
      catchAsyncSocket(
        async ({ stageId, id }: TaskStage, callback: Function) => {
          console.log('asd', { stageId, id });
          await BasicTasksServices.delete(+id);
          await emitStage(stageId);
          callback();
        }
      )
    );
    socket.on(
      'client:upper-or-lower-task-basic',
      catchAsyncSocket(
        async (
          { stageId, id, ...body }: TaskStage,
          typeGte: 'upper' | 'lower'
          // callback: Function
        ) => {
          await BasicTasksServices.addToUpperorLower(+id, body, typeGte);
          await emitStage(stageId);
          // callback();
        }
      )
    );
  }
};

export default basicSocketCotroller;
