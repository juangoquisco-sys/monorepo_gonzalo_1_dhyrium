import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
// import { Server as WebSocketServer } from 'socket.io';
import http from 'http';
import { Socket } from 'net';
import pc from 'picocolors';

import AppError from '@/utils/appError';
import globalErrorHandler from '@/middlewares/error.middleware';
import Sockets from '@/models/sockets';
import { verifySecretEnv } from '@/middlewares/auth.middleware';
import TimerCron from '@/models/timer';
import { setAdmin } from '@/utils/tools';
import path from 'path';
import docs from '@/middlewares/docs.middleware';
import { exec } from 'child_process';
import SocketManager from '@/models/SocketManager';
import { existsSync, mkdirSync } from 'fs';
import AuditLogServices from '@/services/auditLog.services';
import KitchenServices from '@/services/kitchen.services';
import PathServices from '@/services/paths.services';
import { routesConfig } from '@/routes/routeRegistry';
import { auditLogger } from '@/middlewares/auditLogger.middleware';
import iclockRouter from '@/routes/iclock.routes';
// import delay from '../utils/delay';
import DutyAssignmentService from '@/services/rotations/assignment.service';
import DutyRotationService from '@/services/rotations/duty.service';
import { requestContext } from '@/middlewares/requestContext.middleware';
import { createHttpLogger } from '@/utils/httpLogger';
import { ENV } from '@/config/env';
import DocumentComposerService from '@/modules/document-composer/documentComposer.service';
import { isPrivateTaskDocumentUploadPath } from '@/modules/task-documents/taskDocumentAssets.domain';
import { isPrivateCorporateArchivePath } from '@/modules/corporate-archive/corporateArchive.storage';
import { isPrivateLetterArchivePath } from '@/modules/letter-archive/letterArchive.storage';
// import {
//   createZktecoDeviceServiceFromEnv,
//   type ZktecoDeviceService,
// } from '@/services/attendance/zktecoDevice.service';
// import GenerateFiles from '../utils/generateFile';
// import { exec } from 'child_process';

const canReachDatabase = async (timeoutMs = 2500) => {
  const databaseUrl = ENV.DATABASE_URL;

  try {
    const url = new URL(databaseUrl);
    const port = Number(url.port || '5432');
    if (!url.hostname || Number.isNaN(port)) return false;

    return await new Promise<boolean>(resolve => {
      const socket = new Socket();
      const done = (result: boolean) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => done(true));
      socket.once('timeout', () => done(false));
      socket.once('error', () => done(false));
      socket.connect(port, url.hostname);
    });
  } catch {
    return false;
  }
};

class Server {
  private app!: Application;
  // private io: WebSocketServer;
  private httpServer: http.Server;
  private PORT = ENV.PORT;
  private HOST = ENV.HOST;
  private rootDir = path.resolve(__dirname, '../..');
  // private zktecoDevice: ZktecoDeviceService | null =
  //   createZktecoDeviceServiceFromEnv();

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.conectionCron();
    this.app.set('trust proxy', '1');

    this.conectionWebSockect();
    this.middlewares();
    this.routes();
    this.files();
  }

  middlewares() {
    this.app.use(requestContext);
    this.morganConfiguration();
    this.app.use(
      cors({
        exposedHeaders: ['File-Name', 'X-Request-ID', 'Retry-After'],
        // Las sesiones de Word usan OPTIONS/WebDAV y deben llegar a su ruta
        // para publicar DAV, MS-Author-Via y los métodos admitidos.
        preflightContinue: true,
      })
    );
    this.app.use('/projects', express.static('uploads/projects'));
    this.app.use(
      '/uploads',
      (req: Request, res: Response, next: NextFunction) => {
        if (
          !isPrivateTaskDocumentUploadPath(req.path) &&
          !isPrivateCorporateArchivePath(req.path) &&
          !isPrivateLetterArchivePath(req.path)
        ) return next();
        res.set({
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        });
        return res.status(404).json({ message: 'Ruta no disponible.' });
      },
      express.static('uploads')
    );
    this.app.use('/index', express.static('index'));
    this.app.use('/models', express.static('uploads/models'));
    this.app.use('/editables', express.static('uploads/editables'));
    this.app.use('/task-document-assets', (_req, res) => {
      res.set({
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      });
      res.status(404).json({ message: 'Ruta no disponible.' });
    });
    this.app.use('/reviews', express.static('uploads/reviews'));
    this.app.use(
      ['/file-user/tutorials', '/public/tutorials', '/images/tutorials'],
      (_req, res) => {
        res.status(404).json({ message: 'Ruta no disponible.' });
      }
    );
    this.app.use('/file-user', express.static('public'));
    this.app.use('/general', express.static('public/general'));
    this.app.use('/reports', express.static('public/reports'));
    this.app.use('/images', express.static('public'));
    this.app.use('/public', express.static('public'));

    this.app.use('/iclock', iclockRouter);
    this.app.use(
      `/${ENV.ROUTE}/task-documents`,
      express.json({ limit: '16mb' })
    );
    this.app.use(express.json());
    this.app.use(verifySecretEnv);
    this.app.use(auditLogger);
  }

  morganConfiguration() {
    this.app.use(createHttpLogger(ENV.NODE_ENV === 'production'));
  }
  //ms-word:ofe|u|http://localhost:8081/file-user/cv%20%2015-03-2024.docx
  // ms-word:ofe|u|http://localhost:8081/api-docs/file-user/cv%20%2015-03-2024.docx
  async conectionCron() {
    const time = new TimerCron('30 6 * * *');
    time.crontimer(() => {
      if (ENV.NODE_ENV !== 'production') {
        console.log('Aca habia un backup pero en prod');
      } else {
        exec('start backup.bat', (error, stdout, _stderr) => {
          if (error) {
            console.log(pc.bgRed(`stderr: ${error}`));
            return;
          }
          console.log(pc.bgGreen(`${stdout}: backup_creado`));
        });
      }
    });

    const documentArtifactCleanupCron = new TimerCron('40 3 * * *', {
      timezone: 'America/Lima',
    });
    documentArtifactCleanupCron.crontimerAsync(async () => {
      const result = await DocumentComposerService.cleanupExpired();
      if (result.removed > 0) {
        console.log(
          pc.yellow(
            `Document composer: ${result.removed} artefactos expirados limpiados`
          )
        );
      }
    });

    const dutyNoShowCron = new TimerCron('0 0 * * *', {
      timezone: 'America/Lima',
    });
    dutyNoShowCron.crontimerAsync(async () => {
      const result = await DutyAssignmentService.markPastPendingAsNoShow();
      if (result.count > 0) {
        console.log(
          pc.yellow(`Rotaciones: ${result.count} turnos marcados como NO_SHOW`)
        );
      }
    });

    const kitchenPickupCron = new TimerCron('10 0 * * *', {
      timezone: 'America/Lima',
    });
    kitchenPickupCron.crontimerAsync(async () => {
      const result =
        await KitchenServices.markPastServedPendingOrdersAsNotPickedUp();
      if (result.ordersUpdated > 0) {
        console.log(
          pc.yellow(
            `Cocina: ${result.ordersUpdated} pedidos marcados como NOT_PICKED_UP`
          )
        );
      }
    });

    const auditLogCleanupCron = new TimerCron('15 3 * * *', {
      timezone: 'America/Bogota',
    });
    auditLogCleanupCron.crontimerAsync(async () => {
      try {
        const result = await AuditLogServices.cleanupOldLogs({
          maxBatches: 20,
        });
        if (result.deletedCount > 0) {
          console.log(
            pc.yellow(
              `AuditLog: ${
                result.deletedCount
              } registros anteriores a ${result.cutoff.toISOString()} eliminados`
            )
          );
        }
      } catch (error) {
        console.error('Error limpiando AuditLog:', error);
      }
    });

    const dutyReconciliationCron = new TimerCron('5 0 * * *', {
      timezone: 'America/Lima',
    });
    dutyReconciliationCron.crontimerAsync(async () => {
      const result = await DutyRotationService.reconcileActiveDuties();
      console.log(
        pc.green(
          `Rotaciones: ${result.createdCount} creados, ${result.conflictCount} conflictos en ${result.processedCount} actividades`
        )
      );
      if (result.failures.length) {
        console.error(
          'Rotaciones: actividades no reconciliadas',
          result.failures
        );
      }
    });
  }
  conectionWebSockect() {
    SocketManager.init(this.httpServer);
    new Sockets(SocketManager.getInstance());
  }
  routes() {
    // this.app.use(delay(2000));
    routesConfig.forEach(route => {
      this.app.use(`/${ENV.ROUTE}${route.path}`, route.router);
    });

    this.app.use(docs);
    this.app.all(
      '/{*splat}',
      (req: Request, res: Response, next: NextFunction) => {
        res.locals.pageNotFound = path.join(
          this.rootDir,
          '404_page/index.html'
        );
        return next(
          new AppError(`can't find ${req.originalUrl} on this server`, 404)
        );
      }
    );
    this.app.use(globalErrorHandler);
  }
  listen() {
    this.httpServer.listen(this.PORT, async () => {
      if (this.PORT && this.HOST) {
        const server = `http://${this.HOST}:${this.PORT}`;
        console.log(
          pc.green(`🚀 Server deployed at: ${pc.magenta(pc.bold(server))}`)
        );
        console.log(
          pc.green(`📝 View docs at: ${pc.yellow(`${server}/api-docs`)}`)
        );
        // await this.zktecoDevice?.start();
        if (await canReachDatabase()) {
          setAdmin().catch(error => {
            console.error(
              pc.red(
                'No se pudo verificar el usuario administrador inicial. El servidor continua activo.'
              ),
              error
            );
          });
        } else {
          console.warn(
            pc.yellow(
              'Base de datos no disponible para verificar el administrador inicial. El servidor continua activo.'
            )
          );
        }
      } else {
        console.log('No se pudo conectar al servidor 😥');
      }
    });
  }

  async close() {
    // await this.zktecoDevice?.stop();
    if (!this.httpServer.listening) return;

    await new Promise<void>((resolve, reject) => {
      this.httpServer.close(error => {
        if (error) return reject(error);
        return resolve();
      });
    });
  }

  files() {
    const basicos = PathServices.basicPath;
    const presupuestos = PathServices.projectPath;
    if (!existsSync(basicos)) mkdirSync(basicos, { recursive: true });
    if (!existsSync(presupuestos)) mkdirSync(presupuestos, { recursive: true });
  }
}
export default Server;
