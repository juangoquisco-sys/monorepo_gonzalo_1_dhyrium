import { SubTasks } from '@prisma/client';
import { Server as WebSocketServer, Socket } from 'socket.io';
import { CatchAsync, Level } from '@/types/types';
import pc from 'picocolors';
import { authSocket } from '@/socket/middlewares/authSocket.middleware';
import basicSocketCotroller from '@/socket/controllers/basicSocket.controller';
import basicTaskSocketCotroller from '@/socket/controllers/basicTaskSocket.controller';
import budgetSocketCotroller from '@/socket/controllers/budgetSocket.controller';
import budgetTaskSocketCotroller from '@/socket/controllers/budgetTaskSocket.controller';
import AppError from '@/utils/appError';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { resolveClientIp } from '@/utils/clientIp';
import OnlinePresenceService, {
  SYSTEM_SOCKET_USERS_CHANGED_EVENT,
  SYSTEM_USERS_ROOM,
} from '@/services/onlinePresence.services';

interface DataProjectAndTask {
  project: Level;
  task: SubTasks;
}

type HeaderValue = string | string[] | undefined;

interface SocketUser {
  id: number;
  email: string;
  isSystemUser: boolean;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    dni?: string | null;
  } | null;
  role?: {
    name?: string | null;
  } | null;
  offices?: Array<{
    office?: {
      name?: string | null;
    } | null;
  }>;
}

const firstHeaderValue = (value: HeaderValue) => {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
};

const clientIp = (socket: Socket) => {
  const resolution = resolveClientIp({
    headers: socket.handshake.headers as Record<string, HeaderValue>,
    remoteAddress: socket.handshake.address,
  });
  return resolution.ip || null;
};

const socketRooms = (socket: Socket) =>
  Array.from(socket.rooms).filter(room => room !== socket.id);

const fullName = (user: SocketUser) =>
  `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() ||
  user.email;

const emitSystemSocketUsersChanged = (io: WebSocketServer) => {
  io.to(SYSTEM_USERS_ROOM).emit(SYSTEM_SOCKET_USERS_CHANGED_EVENT);
};

class Sockets {
  private io: WebSocketServer;
  constructor(io: WebSocketServer) {
    this.io = io;
    this.socketEvents();
  }
  roomPlace(subTask: SubTasks) {
    const room = subTask.levels_Id;
    return room;
  }

  socketEvents() {
    this.io.use(authSocket);
    this.io.on('connection', socket => {
      const user = socket.data.user as SocketUser;
      socket.join(String(user.id));
      if (user.isSystemUser) {
        socket.join(SYSTEM_USERS_ROOM);
      }

      OnlinePresenceService.registerConnection(
        {
          userId: user.id,
          fullName: fullName(user),
          email: user.email,
          dni: user.profile?.dni || undefined,
          roleName: user.role?.name || null,
          offices:
            user.offices
              ?.map(({ office }) => office?.name)
              .filter((office): office is string => Boolean(office)) || [],
        },
        {
          socketId: socket.id,
          connectedAt: new Date(),
          rooms: socketRooms(socket),
          ip: clientIp(socket),
          userAgent: firstHeaderValue(socket.handshake.headers['user-agent']),
        }
      );
      emitSystemSocketUsersChanged(this.io);

      console.log(
        pc.cyan('User'),
        pc.blue(user.profile?.firstName || user.email),
        pc.cyan('connected successfully')
      );

      socket.on('join', room => {
        console.log('room:', room);
        socket.join(room);
        OnlinePresenceService.updateConnectionRooms(
          user.id,
          socket.id,
          socketRooms(socket)
        );
      });

      socket.on('leave', room => {
        console.log('leave room:', room);
        socket.leave(room);
        OnlinePresenceService.updateConnectionRooms(
          user.id,
          socket.id,
          socketRooms(socket)
        );
      });

      const handleSocketController = (
        controller: (
          socket: Socket,
          io: WebSocketServer,
          catchAsyncSocket?: CatchAsync
        ) => void
      ) => {
        const catchAsyncSocket = <T>(handler: Function) => {
          return async (...args: T[]) => {
            try {
              await handler(...args);
            } catch (error) {
              console.log('capturador de errores', error);
              if (
                error instanceof AppError ||
                error instanceof PrismaClientKnownRequestError
              ) {
                socket.emit('server:error', error.message);
                (args[args.length - 1] as Function)({ error: true });
              }
            }
          };
        };
        controller(socket, this.io, catchAsyncSocket);
      };

      //controllers
      handleSocketController(basicSocketCotroller);
      handleSocketController(budgetSocketCotroller);
      handleSocketController(basicTaskSocketCotroller);
      handleSocketController(budgetTaskSocketCotroller);

      //other
      socket.on('client:update-projectAndTask', (data: DataProjectAndTask) => {
        const { project, task } = data;
        this.io.to(`task-${task.id}`).emit('server:update-subTask', task);
        this.io
          .to(`project-${project.stagesId}`)
          .emit('server:update-project', project);
      });

      socket.on('client:update-task', (task: SubTasks) => {
        this.io.to(`task-${task.id}`).emit('server:update-subTask', task);
      });

      socket.on('client:update-project', (project: Level) => {
        this.io
          .to(`project-${project.stagesId}`)
          .emit('server:update-project', project);
      });

      socket.on('client:refresh-user', roleId => {
        this.io.to(`role-${roleId}`).emit('server:refresh-user');
      });

      socket.on('client:action-button', () => {
        this.io.emit('server:action-button');
        this.io.emit('server:license-update');
      });

      socket.on('client:company-update', () => {
        this.io.emit('server:company-update');
      });

      socket.on('disconnect', () => {
        console.log(
          'User disconected ==>',
          user.profile?.firstName || user.email
        );
        OnlinePresenceService.unregisterConnection(user.id, socket.id);
        emitSystemSocketUsersChanged(this.io);
        socket.leave(String(user.id));
      });
    });
  }
}

export default Sockets;
