export type SystemHealthStatus = 'UP' | 'DEGRADED' | 'DOWN';

export interface SystemHealthResponse {
  status: SystemHealthStatus;
  generatedAt: string;
  uptimeSeconds: number;
  environment: string;
  nodeVersion: string;
  checks: {
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
  };
  signals: {
    auditLast15m: {
      totalErrors: number;
      criticalErrors: number;
    };
    frontendLast15m: {
      totalErrors: number;
      criticalErrors: number;
    };
  };
}
