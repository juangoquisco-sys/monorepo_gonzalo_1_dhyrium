import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ZktecoDeviceService,
  formatZktecoTimestamp,
  mapZktecoRealtimeLog,
  type ZktecoDeviceConfig,
  type ZktecoRealtimeLog,
} from '../src/services/attendance/zktecoDevice.service';

const config: ZktecoDeviceConfig = {
  ip: '192.0.2.10',
  port: 4370,
  timeoutMs: 5200,
  inport: 5000,
  realtimeVerifyMode: '1',
  reconnectDelayMs: 15000,
};

const flushPromises = () =>
  new Promise<void>(resolve => {
    setImmediate(resolve);
  });

test.describe('ZktecoDeviceService', () => {
  test('maps valid realtime records to the shared iClock contract', () => {
    const timestamp = new Date(2026, 6, 25, 8, 9, 10);

    assert.deepEqual(
      mapZktecoRealtimeLog({ userId: 42, attTime: timestamp }, '1'),
      {
        userId: '42',
        timestamp: '2026-07-25 08:09:10',
        status: '',
        verifyMode: '1',
        workCode: '',
        extraColumns: [],
        rawRow: '',
      }
    );
    assert.equal(formatZktecoTimestamp('not-a-date'), null);
    assert.equal(
      mapZktecoRealtimeLog({ userId: '', attTime: timestamp }, '1'),
      null
    );
    assert.equal(
      mapZktecoRealtimeLog({ userId: 42, attTime: timestamp }, ''),
      null
    );
  });

  test('connects, subscribes to realtime records and disconnects cleanly', async () => {
    let realtimeHandler: ((log: ZktecoRealtimeLog) => void) | null = null;
    let disconnected = false;
    const marks: Array<{ serialNumber: string; userId: string }> = [];
    const infoCalls: Array<[string, unknown]> = [];

    const device = {
      async createSocket() {
        return true;
      },
      async getSerialNumber() {
        return 'SERIAL-001';
      },
      async getAttendances() {
        return {
          data: [{ user_id: 'sensitive-user-id' }],
        };
      },
      async getRealTimeLogs(callback: (log: ZktecoRealtimeLog) => void) {
        realtimeHandler = callback;
      },
      async disconnect() {
        disconnected = true;
      },
    };

    const service = new ZktecoDeviceService(config, {
      createDevice: () => device,
      markAttendance: async (serialNumber, log) => {
        marks.push({ serialNumber, userId: log.userId });
        return { outcome: 'NO_OPEN_LIST' };
      },
      logger: {
        info: (label, payload) => infoCalls.push([label, payload]),
        warn: () => undefined,
        error: () => undefined,
      },
    });

    await service.start();
    assert.notEqual(realtimeHandler, null);

    const emitRealtimeLog = realtimeHandler as unknown as (
      log: ZktecoRealtimeLog
    ) => void;
    emitRealtimeLog({
      userId: 42,
      attTime: new Date(2026, 6, 25, 8, 9, 10),
    });
    await flushPromises();

    assert.deepEqual(marks, [{ serialNumber: 'SERIAL-001', userId: '42' }]);
    assert.equal(
      infoCalls.some(
        ([label, payload]) =>
          label === 'ZKTECO DEVICE ATTENDANCES' &&
          (payload as { receivedRecords?: number }).receivedRecords === 1 &&
          !JSON.stringify(payload).includes('sensitive-user-id')
      ),
      true
    );

    await service.stop();
    assert.equal(disconnected, true);
  });
});
