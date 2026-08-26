// socket.js
import { Server as WebSocketServer } from 'socket.io';
import http from 'http';

export enum TypeMailNoti {
  RECEPTION_MESSAGE = 'RECEPTION_MESSAGE',
  CONTINUE_MESSAGE = 'CONTINUE_MESSAGE',
}

interface MailOption {
  from: string;
  subject: string;
  title: string;
  mailId: number;
  typeMail: TypeMailNoti;
}
class SocketManager {
  private static instance: SocketManager;
  private io: WebSocketServer;

  private constructor(server: http.Server) {
    this.io = new WebSocketServer(server, {
      connectionStateRecovery: {},
      cors: {
        origin: '*',
      },
    });
  }

  public static init(server: http.Server): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager(server);
    }
    return SocketManager.instance;
  }

  public static getInstance(): WebSocketServer {
    if (!SocketManager.instance) {
      throw new Error('SocketManager no está inicializado');
    }
    return SocketManager.instance.io;
  }

  public static emitNotification(rooms: string[], mail: MailOption): void {
    if (!SocketManager.instance) {
      throw new Error('SocketManager no está inicializado');
    }
    rooms.forEach(room => {
      SocketManager.instance.io
        .to(room)
        .emit('server:emit-mail-notification', mail);
    });
  }
  public static refreshPayMessage(payMessageId: number): void {
    if (!SocketManager.instance) {
      throw new Error('SocketManager no está inicializado');
    }
    SocketManager.instance.io
      .to(`paymail-${payMessageId}`)
      .emit('server:refresh-pay-message');
  }
}

export default SocketManager;
