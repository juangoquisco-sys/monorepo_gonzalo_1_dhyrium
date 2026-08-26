export interface IclockAttendanceLog {
  userId: string;
  timestamp: string;
  status: string;
  verifyMode: string;
  workCode: string;
  extraColumns: string[];
  rawRow: string;
}

export interface IclockCdataPayload {
  attendanceLogs: IclockAttendanceLog[];
  ignoredRows: string[];
}

export interface IclockOptionsConfig {
  errorDelay: number;
  delay: number;
  transTimes: number;
  transInterval: number;
  transFlag: string;
  realtime: number;
  encrypt: number;
  timeZone: string;
  timeout: number;
  syncTime: number;
  serverVer: string;
  attlogStamp: number;
  operlogStamp: number;
  attphotoStamp: number;
}

export type IclockCdataRequestResult =
  | {
      kind: 'options';
      serialNumber: string;
      response: string;
    }
  | {
      kind: 'time';
      serialNumber: string;
      response: string;
    }
  | {
      kind: 'attlog';
      serialNumber: string;
      table: string;
      payload: IclockCdataPayload;
    }
  | {
      kind: 'raw';
      serialNumber: string;
      table: string;
      rawBody: string;
    };

export interface ResolveIclockCdataRequestInput {
  method: string;
  query: Record<string, unknown>;
  body?: unknown;
  now?: Date;
}

export interface IclockCommandResult {
  commandId: number | null;
  returnCode: number | null;
}

const normalizeCommandField = (value: string, maxLength: number): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\t\r\n]/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const parseIclockAllowedSerials = (
  value: string | undefined
): string[] =>
  Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map(serial => serial.trim())
        .filter(Boolean)
    )
  );

export const buildIclockUpsertUserCommand = ({
  commandId,
  pin,
  name,
}: {
  commandId: number;
  pin: string;
  name: string;
}): string => {
  const safePin = normalizeCommandField(pin, 9);
  const safeName = normalizeCommandField(name, 24);

  if (!/^\d{1,9}$/.test(safePin)) {
    throw new Error('ICLOCK_USER_PIN_INVALID');
  }
  if (!safeName) {
    throw new Error('ICLOCK_USER_NAME_INVALID');
  }

  return [
    `C:${commandId}:DATA UPDATE USERINFO`,
    `PIN=${safePin}`,
    `Name=${safeName}`,
    'Pri=0',
    'Passwd=',
    'Card=',
    'Grp=1',
    'TZ=0000000100000000',
    'Verify=0',
  ].join('\t');
};

const DEFAULT_OPTIONS_CONFIG: IclockOptionsConfig = {
  errorDelay: Number(process.env.ICLOCK_ERROR_DELAY || 60),
  delay: Number(process.env.ICLOCK_DELAY || 10),
  transTimes: Number(process.env.ICLOCK_TRANS_TIMES || 0),
  transInterval: Number(process.env.ICLOCK_TRANS_INTERVAL || 0),
  transFlag: process.env.ICLOCK_TRANS_FLAG || 'AttLog',
  realtime: Number(process.env.ICLOCK_REALTIME || 1),
  encrypt: Number(process.env.ICLOCK_ENCRYPT || 0),
  timeZone: process.env.ICLOCK_TIME_ZONE || '-05:00',
  timeout: Number(process.env.ICLOCK_TIMEOUT || 60),
  syncTime: Number(process.env.ICLOCK_SYNC_TIME || 3600),
  serverVer: process.env.ICLOCK_SERVER_VER || '1.0',
  attlogStamp: Number(process.env.ICLOCK_ATTLOG_STAMP || 0),
  operlogStamp: Number(process.env.ICLOCK_OPERLOG_STAMP || 0),
  attphotoStamp: Number(process.env.ICLOCK_ATTPHOTO_STAMP || 0),
};

const toRawPayload = (body: unknown): string => {
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body == null) return '';
  if (
    typeof body === 'object' &&
    body !== null &&
    Object.keys(body).length === 0
  ) {
    return '';
  }
  return String(body);
};

const getIclockQueryValue = (value: unknown): string => {
  if (Array.isArray(value)) return getIclockQueryValue(value[0]);
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

const pad = (value: number) => String(value).padStart(2, '0');

const formatBogotaTime = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = parts.reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});

  return `${values.year}-${values.month}-${values.day}T${pad(
    Number(values.hour)
  )}:${values.minute}:${values.second}-05:00`;
};

export const buildIclockOptionsResponse = (
  serialNumber: string,
  config: Partial<IclockOptionsConfig> = {}
): string => {
  const options = { ...DEFAULT_OPTIONS_CONFIG, ...config };

  return [
    `GET OPTION FROM: ${serialNumber}`,
    `ErrorDelay=${options.errorDelay}`,
    `Delay=${options.delay}`,
    `TransTimes=${options.transTimes}`,
    `TransInterval=${options.transInterval}`,
    `TransFlag=${options.transFlag}`,
    `Realtime=${options.realtime}`,
    `Encrypt=${options.encrypt}`,
    `TimeZone=${options.timeZone}`,
    `Timeout=${options.timeout}`,
    `SyncTime=${options.syncTime}`,
    `ServerVer=${options.serverVer}`,
    `ATTLOGStamp=${options.attlogStamp}`,
    `OPERLOGStamp=${options.operlogStamp}`,
    `ATTPHOTOStamp=${options.attphotoStamp}`,
  ].join('\n');
};

export const buildIclockTimeResponse = (date = new Date()): string =>
  `Time=${formatBogotaTime(date)}`;

export const resolveIclockCdataRequest = ({
  method,
  query,
  body,
  now = new Date(),
}: ResolveIclockCdataRequestInput): IclockCdataRequestResult => {
  const requestMethod = method.toUpperCase();
  const serialNumber = getIclockQueryValue(query.SN);
  const options = getIclockQueryValue(query.options).toLowerCase();
  const type = getIclockQueryValue(query.type).toLowerCase();
  const table = getIclockQueryValue(query.table).toUpperCase();

  if (requestMethod === 'GET' && options === 'all') {
    return {
      kind: 'options',
      serialNumber,
      response: buildIclockOptionsResponse(serialNumber),
    };
  }

  if (requestMethod === 'GET' && type === 'time') {
    return {
      kind: 'time',
      serialNumber,
      response: buildIclockTimeResponse(now),
    };
  }

  if (requestMethod === 'POST' && table === 'ATTLOG') {
    return {
      kind: 'attlog',
      serialNumber,
      table,
      payload: parseIclockCdataPayload(body),
    };
  }

  return {
    kind: 'raw',
    serialNumber,
    table,
    rawBody: toRawPayload(body),
  };
};

export const parseIclockKeyValuePayload = (
  body: unknown
): Record<string, string> => {
  const payload = toRawPayload(body);
  const entries = payload
    .split(/[\r\n&]+/)
    .map(value => value.trim())
    .filter(Boolean);

  return entries.reduce<Record<string, string>>((result, entry) => {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0) return result;

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!key) return result;

    result[key] = value;
    return result;
  }, {});
};

export const parseIclockCommandResult = (
  body: unknown
): IclockCommandResult => {
  const payload = parseIclockKeyValuePayload(body);
  const commandId = Number(payload.ID);
  const returnCode = Number(payload.Return);

  return {
    commandId:
      Number.isSafeInteger(commandId) && commandId > 0 ? commandId : null,
    returnCode: Number.isSafeInteger(returnCode) ? returnCode : null,
  };
};

export const parseIclockCdataPayload = (body: unknown): IclockCdataPayload => {
  const rows = toRawPayload(body)
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(Boolean);

  return rows.reduce<IclockCdataPayload>(
    (result, rawRow) => {
      const cols = rawRow.split('\t');
      if (cols.length < 5) {
        result.ignoredRows.push(rawRow);
        return result;
      }

      const [userId, timestamp, status, verifyMode, workCode, ...extraColumns] =
        cols;

      result.attendanceLogs.push({
        userId,
        timestamp,
        status,
        verifyMode,
        workCode,
        extraColumns,
        rawRow,
      });

      return result;
    },
    { attendanceLogs: [], ignoredRows: [] }
  );
};

class IclockServices {
  static buildOptionsResponse(serialNumber: string): string {
    return buildIclockOptionsResponse(serialNumber);
  }

  static buildTimeResponse(date = new Date()): string {
    return buildIclockTimeResponse(date);
  }

  static parseRegistryPayload(body: unknown): Record<string, string> {
    return parseIclockKeyValuePayload(body);
  }

  static parseCdataPayload(body: unknown): IclockCdataPayload {
    return parseIclockCdataPayload(body);
  }

  static resolveCdataRequest(
    input: ResolveIclockCdataRequestInput
  ): IclockCdataRequestResult {
    return resolveIclockCdataRequest(input);
  }

  static parseDeviceCommandPayload(body: unknown): Record<string, string> {
    return parseIclockKeyValuePayload(body);
  }

  static parseDeviceCommandResult(body: unknown): IclockCommandResult {
    return parseIclockCommandResult(body);
  }
}

export default IclockServices;
