import AppError from '@/utils/appError';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { sanitizeAuditPayload } from '@/utils/auditSanitizer';

type QueryValue = string | string[] | undefined;
export type QueryLike = Record<string, QueryValue>;

type FrontendLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
type FrontendLogType =
  | 'REACT_RENDER_ERROR'
  | 'WINDOW_ERROR'
  | 'UNHANDLED_REJECTION'
  | 'RESOURCE_ERROR'
  | 'API_ERROR'
  | 'FRONTEND_ROUTE_404'
  | 'FRONTEND_ROUTE_FORBIDDEN'
  | 'CUSTOM';

const MAX_BATCH_SIZE = 20;
const MAX_BREADCRUMBS = 30;
const MAX_STRING_LENGTH = 12000;
const DEFAULT_LIMIT = 25;

const LOG_LEVELS = new Set(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);
const LOG_TYPES = new Set([
  'REACT_RENDER_ERROR',
  'WINDOW_ERROR',
  'UNHANDLED_REJECTION',
  'RESOURCE_ERROR',
  'API_ERROR',
  'FRONTEND_ROUTE_404',
  'FRONTEND_ROUTE_FORBIDDEN',
  'CUSTOM',
]);
const STATUS_GROUPS = new Set(['2xx', '3xx', '4xx', '5xx']);

const FRONTEND_LOG_USER_SELECT = {
  id: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.UsersSelect;

const EVENT_LIST_SELECT = {
  id: true,
  userId: true,
  level: true,
  type: true,
  message: true,
  route: true,
  apiMethod: true,
  apiUrl: true,
  statusCode: true,
  sessionId: true,
  release: true,
  environment: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  user: {
    select: FRONTEND_LOG_USER_SELECT,
  },
} satisfies Prisma.FrontendLogEventSelect;

const EVENT_DETAIL_SELECT = {
  ...EVENT_LIST_SELECT,
  stack: true,
  componentStack: true,
  previousRoute: true,
  source: true,
  line: true,
  column: true,
  requestId: true,
  breadcrumbs: true,
  context: true,
} satisfies Prisma.FrontendLogEventSelect;

interface FrontendLogFilters {
  limit: number;
  search?: string;
  userIds?: number[];
  levels?: string[];
  types?: string[];
  route?: string;
  environment?: string;
  release?: string;
  statusCode?: number;
  statusGroups?: string[];
  from?: Date;
  to?: Date;
  snapshotAt: Date;
  cursorCreatedAt?: Date;
  cursorId?: number;
  direction: 'next' | 'prev';
}

interface IngestContext {
  userId: number;
  ipAddress: string;
  userAgent: string;
}

interface FrontendLogInput {
  level?: unknown;
  type?: unknown;
  message?: unknown;
  stack?: unknown;
  componentStack?: unknown;
  route?: unknown;
  previousRoute?: unknown;
  source?: unknown;
  line?: unknown;
  column?: unknown;
  apiMethod?: unknown;
  apiUrl?: unknown;
  statusCode?: unknown;
  requestId?: unknown;
  sessionId?: unknown;
  release?: unknown;
  environment?: unknown;
  breadcrumbs?: unknown;
  context?: unknown;
}

const firstQueryValue = (value: QueryValue) =>
  Array.isArray(value) ? value[0] : value;

const optionalString = (value: QueryValue) => {
  const normalized = firstQueryValue(value)?.trim();
  if (!normalized || normalized === 'all') return undefined;
  return normalized;
};

const queryValues = (value: QueryValue) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(
      values
        .flatMap(item => item.split(','))
        .map(item => item.trim())
        .filter(item => item && item !== 'all')
    )
  );
};

const parseBoundedInteger = (
  value: QueryValue,
  name: string,
  fallback: number,
  min: number,
  max: number
) => {
  const normalized = optionalString(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(`Parametro ${name} invalido`, 400);
  }
  return parsed;
};

const parseOptionalInteger = (
  value: QueryValue,
  name: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
) => {
  const normalized = optionalString(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(`Parametro ${name} invalido`, 400);
  }
  return parsed;
};

const parseIntegerList = (
  value: QueryValue,
  name: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
) => {
  const values = queryValues(value);
  if (!values.length) return undefined;
  return values.map(item => {
    const parsed = Number(item);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new AppError(`Parametro ${name} invalido`, 400);
    }
    return parsed;
  });
};

const parseDate = (value: QueryValue, name: string, endOfDay = false) => {
  const normalized = optionalString(value);
  if (!normalized) return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T00:00:00`)
    : new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Parametro ${name} invalido`, 400);
  }
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};

const parseRequiredDate = (value: QueryValue, name: string, fallback: Date) =>
  parseDate(value, name) || fallback;

const parseEnumList = (
  value: QueryValue,
  allowed: Set<string>,
  name: string,
  transform: (value: string) => string = item => item
) => {
  const values = queryValues(value);
  if (!values.length) return undefined;
  return values.map(item => {
    const parsed = transform(item);
    if (!allowed.has(parsed)) {
      throw new AppError(`Parametro ${name} invalido`, 400);
    }
    return parsed;
  });
};

const parseDirection = (value: QueryValue) => {
  const normalized = optionalString(value);
  if (!normalized) return 'next';
  if (normalized !== 'next' && normalized !== 'prev') {
    throw new AppError('Parametro direction invalido', 400);
  }
  return normalized;
};

const sanitizeString = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > MAX_STRING_LENGTH
    ? trimmed.slice(0, MAX_STRING_LENGTH)
    : trimmed;
};

const normalizeLevel = (value: unknown): FrontendLogLevel => {
  const normalized = sanitizeString(value, 'ERROR').toUpperCase();
  return LOG_LEVELS.has(normalized)
    ? (normalized as FrontendLogLevel)
    : 'ERROR';
};

const normalizeType = (value: unknown): FrontendLogType => {
  const normalized = sanitizeString(value, 'CUSTOM').toUpperCase();
  return LOG_TYPES.has(normalized) ? (normalized as FrontendLogType) : 'CUSTOM';
};

const normalizeOptionalInteger = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const sanitizeJson = (value: unknown, fallback: Prisma.InputJsonValue) => {
  const sanitized = sanitizeAuditPayload(value);
  if (sanitized === null) return fallback;
  const serialized = JSON.stringify(sanitized);
  if (serialized.length > 30000) {
    return { truncated: true, originalSize: serialized.length };
  }
  return sanitized as Prisma.InputJsonValue;
};

const normalizeBreadcrumbs = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_BREADCRUMBS).map(item => sanitizeAuditPayload(item));
};

interface NormalizedFrontendLog {
  level: FrontendLogLevel;
  type: FrontendLogType;
  message: string;
  stack: string;
  componentStack: string;
  route: string;
  previousRoute: string;
  source: string;
  line?: number;
  column?: number;
  apiMethod: string;
  apiUrl: string;
  statusCode?: number;
  requestId: string;
  sessionId: string;
  release: string;
  environment: string;
  breadcrumbs: Prisma.InputJsonValue;
  context: Prisma.InputJsonValue;
}

const normalizeLog = (raw: FrontendLogInput): NormalizedFrontendLog => {
  const level = normalizeLevel(raw.level);
  const type = normalizeType(raw.type);
  const message = sanitizeString(raw.message) || 'Unknown frontend error';
  const stack = sanitizeString(raw.stack);
  const route = sanitizeString(raw.route);
  return {
    level,
    type,
    message,
    stack,
    componentStack: sanitizeString(raw.componentStack),
    route,
    previousRoute: sanitizeString(raw.previousRoute),
    source: sanitizeString(raw.source),
    line: normalizeOptionalInteger(raw.line),
    column: normalizeOptionalInteger(raw.column),
    apiMethod: sanitizeString(raw.apiMethod).toUpperCase(),
    apiUrl: sanitizeString(raw.apiUrl),
    statusCode: normalizeOptionalInteger(raw.statusCode),
    requestId: sanitizeString(raw.requestId),
    sessionId: sanitizeString(raw.sessionId),
    release: sanitizeString(raw.release, 'unknown') || 'unknown',
    environment: sanitizeString(raw.environment, 'production') || 'production',
    breadcrumbs: sanitizeJson(normalizeBreadcrumbs(raw.breadcrumbs), []),
    context: sanitizeJson(raw.context, {}),
  };
};

const buildEventWhere = (
  filters: FrontendLogFilters
): Prisma.FrontendLogEventWhereInput => {
  const and: Prisma.FrontendLogEventWhereInput[] = [];

  if (filters.search) {
    const contains = { contains: filters.search, mode: 'insensitive' } as const;
    and.push({
      OR: [
        { message: contains },
        { route: contains },
        { apiUrl: contains },
        { sessionId: contains },
        { user: { email: contains } },
        { user: { profile: { firstName: contains } } },
        { user: { profile: { lastName: contains } } },
      ],
    });
  }
  if (filters.userIds?.length) and.push({ userId: { in: filters.userIds } });
  if (filters.levels?.length) and.push({ level: { in: filters.levels } });
  if (filters.types?.length) and.push({ type: { in: filters.types } });
  if (filters.route) {
    and.push({ route: { contains: filters.route, mode: 'insensitive' } });
  }
  if (filters.environment) and.push({ environment: filters.environment });
  if (filters.release) and.push({ release: filters.release });
  if (filters.statusCode) and.push({ statusCode: filters.statusCode });
  if (filters.statusGroups?.length) {
    and.push({
      OR: filters.statusGroups.map(group => {
        const start = Number(group[0]) * 100;
        return {
          statusCode: {
            gte: start,
            lt: start + 100,
          },
        };
      }),
    });
  }
  if (filters.from || filters.to || filters.snapshotAt) {
    const upperDate =
      filters.to && filters.to < filters.snapshotAt
        ? filters.to
        : filters.snapshotAt;
    and.push({
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        lte: upperDate,
      },
    });
  }
  if (filters.cursorCreatedAt && filters.cursorId) {
    const operator = filters.direction === 'next' ? 'lt' : 'gt';
    and.push({
      OR: [
        { createdAt: { [operator]: filters.cursorCreatedAt } },
        {
          createdAt: filters.cursorCreatedAt,
          id: { [operator]: filters.cursorId },
        },
      ],
    });
  }

  return and.length ? { AND: and } : {};
};

const serializeEventCursor = (
  event:
    | Pick<
        Prisma.FrontendLogEventGetPayload<{ select: typeof EVENT_LIST_SELECT }>,
        'id' | 'createdAt'
      >
    | undefined
) =>
  event
    ? {
        cursorCreatedAt: event.createdAt.toISOString(),
        cursorId: event.id,
      }
    : null;

const formatEventPage = <
  T extends Pick<
    Prisma.FrontendLogEventGetPayload<{ select: typeof EVENT_LIST_SELECT }>,
    'id' | 'createdAt'
  >
>(
  rows: T[],
  filters: FrontendLogFilters
) => {
  const hasExtra = rows.length > filters.limit;
  let data = hasExtra ? rows.slice(0, filters.limit) : rows;
  if (filters.direction === 'prev') data = data.reverse();
  return {
    data,
    meta: {
      limit: filters.limit,
      snapshotAt: filters.snapshotAt.toISOString(),
      nextCursor: hasExtra ? serializeEventCursor(data[data.length - 1]) : null,
      prevCursor: serializeEventCursor(data[0]),
      hasNextPage: filters.direction === 'next' ? hasExtra : true,
      hasPrevPage:
        filters.direction === 'prev' ? hasExtra : Boolean(filters.cursorId),
    },
  };
};

class FrontendLogServices {
  static normalizeFilters(query: QueryLike): FrontendLogFilters {
    return {
      limit: parseBoundedInteger(query.limit, 'limit', DEFAULT_LIMIT, 1, 100),
      search: optionalString(query.search),
      userIds: parseIntegerList(query.userId, 'userId'),
      levels: parseEnumList(query.level, LOG_LEVELS, 'level', value =>
        value.toUpperCase()
      ),
      types: parseEnumList(query.type, LOG_TYPES, 'type', value =>
        value.toUpperCase()
      ),
      route: optionalString(query.route),
      environment: optionalString(query.environment),
      release: optionalString(query.release),
      statusCode: parseOptionalInteger(
        query.statusCode,
        'statusCode',
        100,
        599
      ),
      statusGroups: parseEnumList(
        query.statusGroup,
        STATUS_GROUPS,
        'statusGroup'
      ),
      from: parseDate(query.from, 'from'),
      to: parseDate(query.to, 'to', true),
      snapshotAt: parseRequiredDate(query.snapshotAt, 'snapshotAt', new Date()),
      cursorCreatedAt: parseDate(query.cursorCreatedAt, 'cursorCreatedAt'),
      cursorId: parseOptionalInteger(query.cursorId, 'cursorId'),
      direction: parseDirection(query.direction),
    };
  }

  static async ingestBatch(rawBody: unknown, context: IngestContext) {
    const logs = (rawBody as { logs?: unknown })?.logs;
    if (!Array.isArray(logs)) {
      throw new AppError('El lote de frontend logs es invalido', 400);
    }
    if (logs.length === 0) return { accepted: 0 };
    if (logs.length > MAX_BATCH_SIZE) {
      throw new AppError(
        `El lote no puede superar ${MAX_BATCH_SIZE} logs`,
        400
      );
    }

    const now = new Date();
    const normalizedLogs = logs.map(log =>
      normalizeLog(log as FrontendLogInput)
    );

    await prisma.$transaction(async tx => {
      for (const log of normalizedLogs) {
        await tx.frontendLogEvent.create({
          data: {
            userId: context.userId,
            level: log.level,
            type: log.type,
            message: log.message,
            stack: log.stack || null,
            componentStack: log.componentStack || null,
            route: log.route,
            previousRoute: log.previousRoute,
            source: log.source,
            line: log.line,
            column: log.column,
            apiMethod: log.apiMethod,
            apiUrl: log.apiUrl,
            statusCode: log.statusCode,
            requestId: log.requestId,
            sessionId: log.sessionId,
            release: log.release,
            environment: log.environment,
            breadcrumbs: log.breadcrumbs,
            context: log.context,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            createdAt: now,
          },
        });
      }
    });

    return { accepted: normalizedLogs.length };
  }

  static async listEvents(rawQuery: QueryLike) {
    const filters = this.normalizeFilters(rawQuery);
    const rows = await prisma.frontendLogEvent.findMany({
      where: buildEventWhere(filters),
      select: EVENT_LIST_SELECT,
      orderBy:
        filters.direction === 'prev'
          ? [{ createdAt: 'asc' }, { id: 'asc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
    });

    return formatEventPage(rows, filters);
  }

  static async findEventById(id: number) {
    const event = await prisma.frontendLogEvent.findUnique({
      where: { id },
      select: EVENT_DETAIL_SELECT,
    });
    if (!event) throw new AppError('Evento de frontend log no encontrado', 404);
    return event;
  }

  static async summary(rawQuery: QueryLike) {
    const filters = this.normalizeFilters(rawQuery);
    const eventWhere = buildEventWhere(filters);
    const since24h = new Date(
      filters.snapshotAt.getTime() - 24 * 60 * 60 * 1000
    );

    const [
      totalEvents,
      criticalEvents,
      eventsLast24h,
      eventsByType,
      eventsByLevel,
      topRoutes,
      recentCriticalEvents,
    ] = await Promise.all([
      prisma.frontendLogEvent.count({ where: eventWhere }),
      prisma.frontendLogEvent.count({
        where: { AND: [eventWhere, { level: 'CRITICAL' }] },
      }),
      prisma.frontendLogEvent.count({
        where: { AND: [eventWhere, { createdAt: { gte: since24h } }] },
      }),
      prisma.frontendLogEvent.groupBy({
        by: ['type'],
        where: eventWhere,
        _count: { _all: true },
        orderBy: { _count: { type: 'desc' } },
        take: 10,
      }),
      prisma.frontendLogEvent.groupBy({
        by: ['level'],
        where: eventWhere,
        _count: { _all: true },
        orderBy: { _count: { level: 'desc' } },
      }),
      prisma.frontendLogEvent.groupBy({
        by: ['route'],
        where: eventWhere,
        _count: { _all: true },
        orderBy: { _count: { route: 'desc' } },
        take: 10,
      }),
      prisma.frontendLogEvent.findMany({
        where: {
          AND: [eventWhere, { level: { in: ['ERROR', 'CRITICAL'] } }],
        },
        select: EVENT_LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
    ]);

    return {
      totalEvents,
      criticalEvents,
      eventsLast24h,
      eventsByType: eventsByType.map(item => ({
        type: item.type,
        count: item._count._all,
      })),
      eventsByLevel: eventsByLevel.map(item => ({
        level: item.level,
        count: item._count._all,
      })),
      topRoutes: topRoutes.map(item => ({
        route: item.route || 'Sin ruta',
        count: item._count._all,
      })),
      recentCriticalEvents,
    };
  }
}

export default FrontendLogServices;
