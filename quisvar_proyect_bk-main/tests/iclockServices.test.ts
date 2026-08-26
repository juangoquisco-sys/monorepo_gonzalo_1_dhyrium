import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import iclockRouter from '../src/routes/iclock.routes';
import {
  buildIclockUpsertUserCommand,
  buildIclockOptionsResponse,
  buildIclockTimeResponse,
  parseIclockAllowedSerials,
  parseIclockCommandResult,
  parseIclockCdataPayload,
  parseIclockKeyValuePayload,
  resolveIclockCdataRequest,
} from '../src/services/iclock.services';
import IclockCommandService from '../src/services/iclockCommand.service';
import BiometricAttendanceService, {
  type BiometricMarkResult,
} from '../src/services/attendance/biometricAttendance.service';

const withIclockServer = async (
  run: (baseUrl: string) => Promise<void>
): Promise<void> => {
  const app = express();
  app.use('/iclock', iclockRouter);

  const server: Server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) return reject(error);
        return resolve();
      });
    });
  }
};

const captureConsoleInfo = () => {
  const originalInfo = console.info;
  const calls: unknown[][] = [];

  console.info = (...args: unknown[]) => {
    calls.push(args);
  };

  return {
    calls,
    restore: () => {
      console.info = originalInfo;
    },
  };
};

const hasConsolePayload = (
  calls: unknown[][],
  label: string,
  predicate: (payload: Record<string, unknown>) => boolean
) =>
  calls.some(call => {
    if (call[0] !== label) return false;
    const payload = call[1];
    if (typeof payload !== 'object' || payload === null) return false;
    return predicate(payload as Record<string, unknown>);
  });

test.describe('IclockServices', () => {
  test('parses key value payloads separated by new lines or ampersands', () => {
    assert.deepEqual(parseIclockKeyValuePayload('SN=ABC123\nIP=10.0.0.5'), {
      SN: 'ABC123',
      IP: '10.0.0.5',
    });

    assert.deepEqual(parseIclockKeyValuePayload('SN=ABC123&DeviceType=ZKT'), {
      SN: 'ABC123',
      DeviceType: 'ZKT',
    });
  });

  test('normalizes configured device serials', () => {
    assert.deepEqual(parseIclockAllowedSerials(' MB10-A,MB10-B, MB10-A ,,'), [
      'MB10-A',
      'MB10-B',
    ]);
  });

  test('serializes an MB10-VL USERINFO upsert command safely', () => {
    assert.equal(
      buildIclockUpsertUserCommand({
        commandId: 17,
        pin: '72845631',
        name: 'José\nPérez',
      }),
      [
        'C:17:DATA UPDATE USERINFO',
        'PIN=72845631',
        'Name=Jose Perez',
        'Pri=0',
        'Passwd=',
        'Card=',
        'Grp=1',
        'TZ=0000000100000000',
        'Verify=0',
      ].join('\t')
    );
  });

  test('rejects a USERINFO command with a non-numeric PIN', () => {
    assert.throws(
      () =>
        buildIclockUpsertUserCommand({
          commandId: 17,
          pin: 'ABC',
          name: 'Usuario',
        }),
      /ICLOCK_USER_PIN_INVALID/
    );
  });

  test('parses command acknowledgements', () => {
    assert.deepEqual(parseIclockCommandResult('ID=17&Return=0&CMD=DATA'), {
      commandId: 17,
      returnCode: 0,
    });
    assert.deepEqual(parseIclockCommandResult('Return=broken'), {
      commandId: null,
      returnCode: null,
    });
  });

  test('parses ATTLOG tab separated rows and keeps malformed rows aside', () => {
    const payload = [
      '42\t2026-07-05 08:01:02\t0\t1\t0',
      'malformed row',
      '77\t2026-07-05 17:30:00\t1\t15\t2\textra',
    ].join('\n');

    const result = parseIclockCdataPayload(payload);

    assert.deepEqual(result.attendanceLogs, [
      {
        userId: '42',
        timestamp: '2026-07-05 08:01:02',
        status: '0',
        verifyMode: '1',
        workCode: '0',
        extraColumns: [],
        rawRow: '42\t2026-07-05 08:01:02\t0\t1\t0',
      },
      {
        userId: '77',
        timestamp: '2026-07-05 17:30:00',
        status: '1',
        verifyMode: '15',
        workCode: '2',
        extraColumns: ['extra'],
        rawRow: '77\t2026-07-05 17:30:00\t1\t15\t2\textra',
      },
    ]);
    assert.deepEqual(result.ignoredRows, ['malformed row']);
  });

  test('builds PUSH options response with device serial number', () => {
    const response = buildIclockOptionsResponse('UDP3235000878');

    assert.equal(response.split('\n')[0], 'GET OPTION FROM: UDP3235000878');
    assert.match(response, /TransFlag=AttLog/);
    assert.match(response, /Realtime=1/);
    assert.match(response, /TimeZone=-05:00/);
  });

  test('builds time response using America/Bogota offset', () => {
    const response = buildIclockTimeResponse(
      new Date('2026-07-05T13:04:05.000Z')
    );

    assert.equal(response, 'Time=2026-07-05T08:04:05-05:00');
  });

  test('resolves GET cdata options without parsing ATTLOG payload', () => {
    const result = resolveIclockCdataRequest({
      method: 'GET',
      query: {
        SN: 'UDP3235000878',
        options: 'all',
      },
      body: {},
    });

    if (result.kind !== 'options') {
      assert.fail(`Expected options result, got ${result.kind}`);
    }

    assert.equal(result.serialNumber, 'UDP3235000878');
    assert.match(result.response, /GET OPTION FROM: UDP3235000878/);
    assert.equal('payload' in result, false);
  });

  test('resolves POST ATTLOG and parses attendance rows', () => {
    const result = resolveIclockCdataRequest({
      method: 'POST',
      query: {
        SN: 'UDP3235000878',
        table: 'ATTLOG',
      },
      body: '42\t2026-07-05 08:01:02\t0\t1\t0',
    });

    if (result.kind !== 'attlog') {
      assert.fail(`Expected attlog result, got ${result.kind}`);
    }

    assert.equal(result.payload.attendanceLogs.length, 1);
    assert.equal(result.payload.attendanceLogs[0].userId, '42');
    assert.deepEqual(result.payload.ignoredRows, []);
  });

  test('returns PUSH options over HTTP and logs response body', async () => {
    const consoleCapture = captureConsoleInfo();

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(
          `${baseUrl}/iclock/cdata?SN=UDP3235000878&options=all`
        );
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.match(body, /GET OPTION FROM: UDP3235000878/);
        assert.match(body, /Realtime=1/);
        assert.equal(
          hasConsolePayload(
            consoleCapture.calls,
            'ICLOCK CDATA OPTIONS',
            payload =>
              String(payload.responseBody || '').includes(
                'GET OPTION FROM: UDP3235000878'
              )
          ),
          true
        );
      });
    } finally {
      consoleCapture.restore();
    }
  });

  test('returns ADMS time over HTTP', async () => {
    const consoleCapture = captureConsoleInfo();

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(
          `${baseUrl}/iclock/cdata?SN=UDP3235000878&type=time`
        );
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.match(body, /^Time=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
      });
    } finally {
      consoleCapture.restore();
    }
  });

  test('parses POST ATTLOG over HTTP', async () => {
    const consoleCapture = captureConsoleInfo();
    const originalMarkFromIclock = BiometricAttendanceService.markFromIclock;
    BiometricAttendanceService.markFromIclock =
      async (): Promise<BiometricMarkResult> => ({
        outcome: 'NO_OPEN_LIST',
      });

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(
          `${baseUrl}/iclock/cdata?SN=UDP3235000878&table=ATTLOG`,
          {
            method: 'POST',
            body: '42\t2026-07-05 08:01:02\t0\t1\t0',
            headers: {
              'content-type': 'text/plain',
            },
          }
        );
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.equal(body, 'OK');
        assert.equal(
          hasConsolePayload(
            consoleCapture.calls,
            'ICLOCK CDATA ATTLOG',
            payload =>
              payload.receivedRows === 1 &&
              !('attendanceLogs' in payload) &&
              !('body' in payload)
          ),
          true
        );
      });
    } finally {
      BiometricAttendanceService.markFromIclock = originalMarkFromIclock;
      consoleCapture.restore();
    }
  });

  test('returns OK for getrequest polling', async () => {
    const consoleCapture = captureConsoleInfo();
    const originalLeaseNext = IclockCommandService.leaseNext;
    IclockCommandService.leaseNext = async () => null;

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(
          `${baseUrl}/iclock/getrequest?SN=UDP3235000878`
        );
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /text\/plain/);
        assert.equal(body, 'OK');
        assert.equal(
          hasConsolePayload(
            consoleCapture.calls,
            'ICLOCK GETREQUEST',
            payload =>
              payload.serialNumber === 'UDP3235000878' &&
              payload.hasCommand === false
          ),
          true
        );
      });
    } finally {
      IclockCommandService.leaseNext = originalLeaseNext;
      consoleCapture.restore();
    }
  });

  test('returns a pending USERINFO command from getrequest', async () => {
    const consoleCapture = captureConsoleInfo();
    const originalLeaseNext = IclockCommandService.leaseNext;
    IclockCommandService.leaseNext = async serialNumber =>
      serialNumber === 'MB10-A'
        ? buildIclockUpsertUserCommand({
            commandId: 21,
            pin: '72845631',
            name: 'Juan Perez',
          })
        : null;

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/iclock/getrequest?SN=MB10-A`);
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.match(body, /^C:21:DATA UPDATE USERINFO\t/);
        assert.match(body, /\tPIN=72845631\t/);
      });
    } finally {
      IclockCommandService.leaseNext = originalLeaseNext;
      consoleCapture.restore();
    }
  });

  test('acknowledges a completed device command', async () => {
    const consoleCapture = captureConsoleInfo();
    const originalAcknowledge = IclockCommandService.acknowledge;
    const acknowledgements: unknown[] = [];
    IclockCommandService.acknowledge = async input => {
      acknowledgements.push(input);
      return 'COMPLETED';
    };

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/iclock/devicecmd?SN=MB10-A`, {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: 'ID=21&Return=0&CMD=DATA',
        });

        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'OK');
        assert.deepEqual(acknowledgements, [
          {
            serialNumber: 'MB10-A',
            commandId: 21,
            returnCode: 0,
            rawResult: 'ID=21&Return=0&CMD=DATA',
          },
        ]);
      });
    } finally {
      IclockCommandService.acknowledge = originalAcknowledge;
      consoleCapture.restore();
    }
  });

  test('returns OK for POST OPERLOG without ATTLOG parsing', async () => {
    const consoleCapture = captureConsoleInfo();

    try {
      await withIclockServer(async baseUrl => {
        const response = await fetch(
          `${baseUrl}/iclock/cdata?SN=UDP3235000878&table=OPERLOG`,
          {
            method: 'POST',
            body: 'operlog raw payload',
            headers: {
              'content-type': 'text/plain',
            },
          }
        );
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.equal(body, 'OK');
        assert.equal(
          consoleCapture.calls.some(call => call[0] === 'ICLOCK CDATA ATTLOG'),
          false
        );
        assert.equal(
          hasConsolePayload(
            consoleCapture.calls,
            'ICLOCK CDATA RAW',
            payload =>
              payload.table === 'OPERLOG' &&
              payload.receivedBytes === 19 &&
              !('rawBody' in payload) &&
              payload.responseBody === 'OK'
          ),
          true
        );
      });
    } finally {
      consoleCapture.restore();
    }
  });
});
