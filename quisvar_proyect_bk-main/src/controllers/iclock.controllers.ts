import { ControllerFunction } from 'types/patterns';
import IclockServices from '../services/iclock.services';
import BiometricAttendanceService from '@/services/attendance/biometricAttendance.service';
import IclockCommandService from '@/services/iclockCommand.service';

const okText = (res: Parameters<ControllerFunction>[1]) => {
  res.type('text/plain').send('OK');
};

const sendText = (res: Parameters<ControllerFunction>[1], body: string) => {
  res.type('text/plain').send(body);
};

export const registry: ControllerFunction = async (req, res) => {
  const parsedBody = IclockServices.parseRegistryPayload(req.body);

  console.info('ICLOCK REGISTRY', {
    query: req.query,
    body: req.body,
    parsedBody,
  });

  okText(res);
};

export const cdata: ControllerFunction = async (req, res) => {
  const cdataRequest = IclockServices.resolveCdataRequest({
    method: req.method,
    query: req.query,
    body: req.body,
  });

  if (cdataRequest.kind === 'options') {
    console.info('ICLOCK CDATA OPTIONS', {
      query: req.query,
      serialNumber: cdataRequest.serialNumber,
      responseBody: cdataRequest.response,
    });
    return sendText(res, cdataRequest.response);
  }

  if (cdataRequest.kind === 'time') {
    console.info('ICLOCK CDATA TIME', {
      query: req.query,
      serialNumber: cdataRequest.serialNumber,
    });
    return sendText(res, cdataRequest.response);
  }

  if (cdataRequest.kind === 'attlog') {
    const outcomes: Record<string, number> = {};
    for (const attendanceLog of cdataRequest.payload.attendanceLogs) {
      const result = await BiometricAttendanceService.markFromIclock(
        cdataRequest.serialNumber,
        attendanceLog
      );
      outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
    }

    console.info('ICLOCK CDATA ATTLOG', {
      serialNumber: cdataRequest.serialNumber,
      receivedRows: cdataRequest.payload.attendanceLogs.length,
      ignoredRows: cdataRequest.payload.ignoredRows.length,
      userIds:
        process.env.NODE_ENV !== 'production'
          ? cdataRequest.payload.attendanceLogs.map(log => log.userId)
          : undefined,
      outcomes,
    });

    return okText(res);
  }

  console.info('ICLOCK CDATA RAW', {
    serialNumber: cdataRequest.serialNumber,
    table: cdataRequest.table,
    receivedBytes: Buffer.byteLength(cdataRequest.rawBody, 'utf8'),
    responseBody: 'OK',
  });

  return okText(res);
};

export const getRequest: ControllerFunction = async (req, res) => {
  const serialNumber = String(req.query.SN ?? '').trim();
  const command = await IclockCommandService.leaseNext(serialNumber);

  console.info('ICLOCK GETREQUEST', {
    serialNumber,
    hasCommand: Boolean(command),
  });

  return sendText(res, command ?? 'OK');
};

export const deviceCommand: ControllerFunction = async (req, res) => {
  const serialNumber = String(req.query.SN ?? '').trim();
  const result = IclockServices.parseDeviceCommandResult(req.body);
  const outcome =
    result.commandId !== null && result.returnCode !== null
      ? await IclockCommandService.acknowledge({
          serialNumber,
          commandId: result.commandId,
          returnCode: result.returnCode,
          rawResult: typeof req.body === 'string' ? req.body : '',
        })
      : 'IGNORED';

  console.info('ICLOCK DEVICECMD', {
    serialNumber,
    commandId: result.commandId,
    returnCode: result.returnCode,
    outcome,
  });

  okText(res);
};
