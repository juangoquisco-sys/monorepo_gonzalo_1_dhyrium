import { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import SocketManager from '@/models/SocketManager';

export type SystemHealthStatus = 'UP' | 'DEGRADED' | 'DOWN';

export interface SystemHealthSignals {
  auditLast15m: {
    totalErrors: number;
    criticalErrors: number;
  };
  frontendLast15m: {
    totalErrors: number;
    criticalErrors: number;
  };
}

export interface SystemHealthChecks {
  backend: {
    status: 'UP';
    message: string;
  };
  database: {
    status: SystemHealthStatus;
    latencyMs: number | null;
    message: string;
  };
  socket: {
    status: 'UP' | 'DEGRADED';
    connectedClients: number | null;
    message: string;
  };
  process: {
    status: 'UP' | 'DEGRADED';
    memory: {
      rssMb: number;
      heapUsedMb: number;
    };
    pid: number;
  };
}

export interface SystemHealthResponse {
  status: SystemHealthStatus;
  generatedAt: string;
  uptimeSeconds: number;
  environment: string;
  nodeVersion: string;
  checks: SystemHealthChecks;
  signals: SystemHealthSignals;
}

export const DATABASE_SLOW_THRESHOLD_MS = 1000;
export const PROCESS_RSS_DEGRADED_THRESHOLD_MB = 1024;
export const PROCESS_HEAP_DEGRADED_THRESHOLD_MB = 512;
export const SYSTEM_HEALTH_SIGNAL_WINDOW_MINUTES = 15;

const emptySignals = (): SystemHealthSignals => ({
  auditLast15m: {
    totalErrors: 0,
    criticalErrors: 0,
  },
  frontendLast15m: {
    totalErrors: 0,
    criticalErrors: 0,
  },
});

const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

export const resolveProcessStatus = (memory: {
  rssMb: number;
  heapUsedMb: number;
}): 'UP' | 'DEGRADED' =>
  memory.rssMb > PROCESS_RSS_DEGRADED_THRESHOLD_MB ||
  memory.heapUsedMb > PROCESS_HEAP_DEGRADED_THRESHOLD_MB
    ? 'DEGRADED'
    : 'UP';

export const resolveSystemHealthStatus = (
  checks: Pick<SystemHealthChecks, 'database' | 'socket' | 'process'>,
  signals: SystemHealthSignals
): SystemHealthStatus => {
  if (checks.database.status === 'DOWN') return 'DOWN';

  const hasCriticalSignals =
    signals.auditLast15m.criticalErrors > 0 ||
    signals.frontendLast15m.criticalErrors > 0;

  if (
    checks.database.status === 'DEGRADED' ||
    checks.socket.status === 'DEGRADED' ||
    checks.process.status === 'DEGRADED' ||
    hasCriticalSignals
  ) {
    return 'DEGRADED';
  }

  return 'UP';
};

class SystemHealthServices {
  private static async checkDatabase(): Promise<
    SystemHealthChecks['database']
  > {
    const startedAt = Date.now();

    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      const latencyMs = Date.now() - startedAt;
      const isSlow = latencyMs > DATABASE_SLOW_THRESHOLD_MS;

      return {
        status: isSlow ? 'DEGRADED' : 'UP',
        latencyMs,
        message: isSlow
          ? 'La base de datos responde con latencia alta'
          : 'La base de datos responde correctamente',
      };
    } catch {
      return {
        status: 'DOWN',
        latencyMs: null,
        message: 'La base de datos no responde',
      };
    }
  }

  private static checkSocket(): SystemHealthChecks['socket'] {
    try {
      const io = SocketManager.getInstance();
      return {
        status: 'UP',
        connectedClients: io.engine.clientsCount,
        message: 'Socket.IO esta inicializado',
      };
    } catch {
      return {
        status: 'DEGRADED',
        connectedClients: null,
        message: 'Socket.IO no esta inicializado',
      };
    }
  }

  private static checkProcess(): SystemHealthChecks['process'] {
    const memoryUsage = process.memoryUsage();
    const memory = {
      rssMb: toMb(memoryUsage.rss),
      heapUsedMb: toMb(memoryUsage.heapUsed),
    };

    return {
      status: resolveProcessStatus(memory),
      memory,
      pid: process.pid,
    };
  }

  private static async getRecentSignals(): Promise<SystemHealthSignals> {
    const since = new Date(
      Date.now() - SYSTEM_HEALTH_SIGNAL_WINDOW_MINUTES * 60 * 1000
    );

    try {
      const [
        auditTotalErrors,
        auditCriticalErrors,
        frontendTotalErrors,
        frontendCriticalErrors,
      ] = await Promise.all([
        prisma.auditLog.count({
          where: {
            createdAt: { gte: since },
            OR: [
              { statusCode: { gte: 400 } },
              { severity: { in: ['ERROR', 'CRITICAL'] } },
            ],
          },
        }),
        prisma.auditLog.count({
          where: {
            createdAt: { gte: since },
            OR: [{ statusCode: { gte: 500 } }, { severity: 'CRITICAL' }],
          },
        }),
        prisma.frontendLogEvent.count({
          where: {
            createdAt: { gte: since },
            level: { in: ['ERROR', 'CRITICAL'] },
          },
        }),
        prisma.frontendLogEvent.count({
          where: {
            createdAt: { gte: since },
            level: 'CRITICAL',
          },
        }),
      ]);

      return {
        auditLast15m: {
          totalErrors: auditTotalErrors,
          criticalErrors: auditCriticalErrors,
        },
        frontendLast15m: {
          totalErrors: frontendTotalErrors,
          criticalErrors: frontendCriticalErrors,
        },
      };
    } catch {
      return emptySignals();
    }
  }

  static async getHealth(): Promise<SystemHealthResponse> {
    const database = await this.checkDatabase();
    const socket = this.checkSocket();
    const processCheck = this.checkProcess();
    const signals =
      database.status === 'DOWN'
        ? emptySignals()
        : await this.getRecentSignals();
    const checks: SystemHealthChecks = {
      backend: {
        status: 'UP',
        message: 'El backend esta respondiendo',
      },
      database,
      socket,
      process: processCheck,
    };

    return {
      status: resolveSystemHealthStatus(checks, signals),
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      checks,
      signals,
    };
  }
}

export default SystemHealthServices;
