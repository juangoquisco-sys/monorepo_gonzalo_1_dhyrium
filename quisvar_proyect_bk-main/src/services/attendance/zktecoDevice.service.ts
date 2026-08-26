import { ENV } from '@/config/env';
import BiometricAttendanceService, {
  type BiometricMarkResult,
} from '@/services/attendance/biometricAttendance.service';
import type { IclockAttendanceLog } from '@/services/iclock.services';
import { createRequire } from 'node:module';

export type ZktecoAttendanceLog = {
  sn?: number;
  user_id?: string | number;
  record_time?: Date | string;
  type?: number;
  state?: number;
  ip?: string;
};

export type ZktecoRealtimeLog = {
  userId?: string | number;
  attTime?: Date | string;
};

export type ZktecoAttendanceResponse = {
  data: ZktecoAttendanceLog[];
  err?: unknown;
};

export type ZktecoDeviceConfig = {
  ip: string;
  port: number;
  timeoutMs: number;
  inport: number;
  realtimeVerifyMode: string;
  reconnectDelayMs: number;
};

type ZktecoDevice = {
  createSocket(
    onError?: (error: unknown) => void,
    onClose?: (connectionType: string) => void
  ): Promise<boolean>;
  getSerialNumber(): Promise<string>;
  getAttendances(): Promise<ZktecoAttendanceResponse>;
  getRealTimeLogs(callback: (log: ZktecoRealtimeLog) => void): Promise<void>;
  disconnect(): Promise<unknown>;
};

type ZktecoConstructor = new (
  ip: string,
  port: number,
  timeout: number,
  inport: number
) => ZktecoDevice;

const requireModule = createRequire(__filename);
const Zkteco = requireModule('zkteco-js') as ZktecoConstructor;

type ZktecoDeviceDependencies = {
  createDevice: (config: ZktecoDeviceConfig) => ZktecoDevice;
  markAttendance: (
    serialNumber: string,
    log: IclockAttendanceLog
  ) => Promise<BiometricMarkResult>;
  logger: Pick<Console, 'info' | 'warn' | 'error'>;
};

const defaultDependencies: ZktecoDeviceDependencies = {
  createDevice: config =>
    new Zkteco(config.ip, config.port, config.timeoutMs, config.inport),
  markAttendance: (serialNumber, log) =>
    BiometricAttendanceService.markFromIclock(serialNumber, log),
  logger: console,
};

const pad = (value: number) => String(value).padStart(2, '0');

export const formatZktecoTimestamp = (
  value: Date | string | undefined
): string | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
};

export const mapZktecoRealtimeLog = (
  log: ZktecoRealtimeLog,
  verifyMode: string
): IclockAttendanceLog | null => {
  const userId = String(log.userId ?? '').trim();
  const timestamp = formatZktecoTimestamp(log.attTime);
  const normalizedVerifyMode = verifyMode.trim();

  if (!userId || !timestamp || !normalizedVerifyMode) return null;

  return {
    userId,
    timestamp,
    status: '',
    verifyMode: normalizedVerifyMode,
    workCode: '',
    extraColumns: [],
    rawRow: '',
  };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export class ZktecoDeviceService {
  private device: ZktecoDevice | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(
    private readonly config: ZktecoDeviceConfig,
    private readonly dependencies: ZktecoDeviceDependencies = defaultDependencies
  ) {}

  async start(): Promise<void> {
    this.stopping = false;
    if (this.device || this.connectPromise) {
      return this.connectPromise ?? undefined;
    }

    this.connectPromise = this.connect().finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const device = this.device;
    this.device = null;
    if (device) await this.safeDisconnect(device);
    if (this.connectPromise) await this.connectPromise;
  }

  private async connect(): Promise<void> {
    const device = this.dependencies.createDevice(this.config);
    this.device = device;

    try {
      await device.createSocket(
        error => this.connectionLost('socket-error', error),
        connectionType => this.connectionLost(`${connectionType}-closed`)
      );
      const serialNumber = (await device.getSerialNumber()).trim();
      if (!serialNumber) throw new Error('DEVICE_SERIAL_NOT_AVAILABLE');

      const attendanceLogs = await device.getAttendances();
      this.dependencies.logger.info('ZKTECO DEVICE ATTENDANCES', {
        receivedRecords: attendanceLogs.data.length,
        hasReadError: Boolean(attendanceLogs.err),
      });

      await device.getRealTimeLogs(log => {
        void this.handleRealtimeLog(serialNumber, log);
      });

      this.dependencies.logger.info('ZKTECO DEVICE CONNECTED', {
        serialNumber,
        realtime: true,
      });
    } catch (error) {
      if (this.device === device) this.device = null;
      await this.safeDisconnect(device);
      this.dependencies.logger.error('ZKTECO DEVICE CONNECTION ERROR', {
        message: getErrorMessage(error),
      });
      this.scheduleReconnect();
    }
  }

  private async handleRealtimeLog(
    serialNumber: string,
    rawLog: ZktecoRealtimeLog
  ): Promise<void> {
    const log = mapZktecoRealtimeLog(rawLog, this.config.realtimeVerifyMode);
    if (!log) {
      this.dependencies.logger.warn('ZKTECO REALTIME LOG IGNORED', {
        reason: 'INVALID_LOG_OR_VERIFY_MODE',
      });
      return;
    }

    try {
      const result = await this.dependencies.markAttendance(serialNumber, log);
      this.dependencies.logger.info('ZKTECO REALTIME ATTENDANCE', {
        outcome: result.outcome,
      });
    } catch (error) {
      this.dependencies.logger.error('ZKTECO REALTIME ATTENDANCE ERROR', {
        message: getErrorMessage(error),
      });
    }
  }

  private connectionLost(reason: string, error?: unknown) {
    if (this.stopping) return;
    this.device = null;
    this.dependencies.logger.warn('ZKTECO DEVICE DISCONNECTED', {
      reason,
      message: error == null ? undefined : getErrorMessage(error),
    });
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.stopping || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start();
    }, this.config.reconnectDelayMs);
  }

  private async safeDisconnect(device: ZktecoDevice) {
    try {
      await device.disconnect();
    } catch (error) {
      if (!this.stopping) {
        this.dependencies.logger.warn('ZKTECO DEVICE DISCONNECT ERROR', {
          message: getErrorMessage(error),
        });
      }
    }
  }
}

export const createZktecoDeviceServiceFromEnv =
  (): ZktecoDeviceService | null => {
    if (!ENV.ZKTECO_DEVICE_IP) return null;

    return new ZktecoDeviceService({
      ip: ENV.ZKTECO_DEVICE_IP,
      port: ENV.ZKTECO_DEVICE_PORT,
      timeoutMs: ENV.ZKTECO_DEVICE_TIMEOUT_MS,
      inport: ENV.ZKTECO_DEVICE_INPORT,
      realtimeVerifyMode: ENV.ZKTECO_REALTIME_VERIFY_MODE ?? '',
      reconnectDelayMs: ENV.ZKTECO_RECONNECT_DELAY_MS,
    });
  };
