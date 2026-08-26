import AppError from '@/utils/appError';
import { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import {
  AUDIT_MODULE_ROUTES,
  getAuditModule,
  getAuditModuleWhere,
  getAuditModulesMatchingSearch,
} from '@/utils/auditModuleMapper';

export const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 90;
export const DEFAULT_AUDIT_LOG_CLEANUP_BATCH_SIZE = 5000;
export const DEFAULT_AUDIT_LOG_CLEANUP_MAX_BATCHES = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type EnvLike = Record<string, string | undefined>;
type QueryValue = string | string[] | undefined;
export type QueryLike = Record<string, QueryValue>;

type AuditStatusGroup = '2xx' | '3xx' | '4xx' | '5xx';
type AuditCursorDirection = 'next' | 'prev';
type AuditSortBy = 'createdAt' | 'statusCode' | 'responseTime' | 'severity';
type AuditSortDir = 'asc' | 'desc';

export interface AuditLogFilters {
  limit: number;
  search?: string;
  userIds?: number[];
  methods?: string[];
  modules?: string[];
  severities?: string[];
  statusCode?: number;
  statusGroups?: AuditStatusGroup[];
  from?: Date;
  to?: Date;
  snapshotAt: Date;
  cursorCreatedAt?: Date;
  cursorId?: number;
  cursorSortValue?: number;
  direction: AuditCursorDirection;
  sortBy: AuditSortBy;
  sortDir: AuditSortDir;
}

const AUDIT_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);
const AUDIT_SEVERITIES = new Set([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'CRITICAL',
]);
const AUDIT_STATUS_GROUPS = new Set(['2xx', '3xx', '4xx', '5xx']);
const AUDIT_CURSOR_DIRECTIONS = new Set(['next', 'prev']);
const AUDIT_SORT_FIELDS = new Set([
  'createdAt',
  'statusCode',
  'responseTime',
  'severity',
]);
const AUDIT_SORT_DIRECTIONS = new Set(['asc', 'desc']);

const AUDIT_LOG_USER_SELECT = {
  id: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.UsersSelect;

const AUDIT_LOG_LIST_SELECT = {
  id: true,
  userId: true,
  action: true,
  method: true,
  path: true,
  severity: true,
  statusCode: true,
  responseTime: true,
  ipAddress: true,
  userAgent: true,
  referrer: true,
  createdAt: true,
  user: {
    select: AUDIT_LOG_USER_SELECT,
  },
} satisfies Prisma.AuditLogSelect;

const AUDIT_LOG_DETAIL_SELECT = {
  ...AUDIT_LOG_LIST_SELECT,
  requestBody: true,
  queryParams: true,
  errorResponse: true,
} satisfies Prisma.AuditLogSelect;

export interface AuditLogCleanupOptions {
  retentionDays?: number;
  batchSize?: number;
  maxBatches?: number;
  now?: Date;
}

export interface AuditLogCleanupResult {
  retentionDays: number;
  batchSize: number;
  maxBatches: number;
  cutoff: Date;
  deletedCount: number;
  batches: number;
}

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number
): number => {
  if (!value) return fallback;
  return resolvePositiveInteger(Number(value), fallback);
};

const resolvePositiveInteger = (
  value: number | undefined,
  fallback: number
): number => {
  if (!Number.isInteger(value) || !value || value <= 0) return fallback;
  return value;
};

const firstQueryValue = (value: QueryValue) =>
  Array.isArray(value) ? value[0] : value;

const optionalString = (value: QueryValue) => {
  const normalized = firstQueryValue(value)?.trim();
  if (!normalized || normalized === 'all') return undefined;
  return normalized;
};

const queryValues = (value: QueryValue) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = values
    .flatMap(item => item.split(','))
    .map(item => item.trim())
    .filter(item => item && item !== 'all');
  return Array.from(new Set(normalized));
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
  if (values.length === 0) return undefined;
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

const parseRequiredDate = (value: QueryValue, name: string, fallback: Date) => {
  const parsed = parseDate(value, name);
  return parsed || fallback;
};

const parseEnum = <T extends string>(
  value: QueryValue,
  allowed: Set<string>,
  name: string,
  transform: (value: string) => string = value => value
) => {
  const normalized = optionalString(value);
  if (!normalized) return undefined;
  const parsed = transform(normalized);
  if (!allowed.has(parsed)) {
    throw new AppError(`Parametro ${name} invalido`, 400);
  }
  return parsed as T;
};

const parseEnumList = <T extends string>(
  value: QueryValue,
  allowed: Set<string>,
  name: string,
  transform: (value: string) => string = item => item
) => {
  const values = queryValues(value);
  if (values.length === 0) return undefined;
  return values.map(item => {
    const parsed = transform(item);
    if (!allowed.has(parsed)) {
      throw new AppError(`Parametro ${name} invalido`, 400);
    }
    return parsed as T;
  });
};

const parseCursorSortValue = (value: QueryValue, sortBy: AuditSortBy) => {
  if (sortBy === 'createdAt') return undefined;
  const normalized = optionalString(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new AppError('Parametro cursorSortValue invalido', 400);
  }
  if (sortBy === 'severity' && (!Number.isInteger(parsed) || parsed < 0)) {
    throw new AppError('Parametro cursorSortValue invalido', 400);
  }
  return parsed;
};

const andWhere = (
  ...conditions: Prisma.AuditLogWhereInput[]
): Prisma.AuditLogWhereInput => {
  const activeConditions = conditions.filter(
    condition => Object.keys(condition).length > 0
  );
  return activeConditions.length ? { AND: activeConditions } : {};
};

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

const withAuditModule = <T extends { path: string }>(log: T) => ({
  ...log,
  module: getAuditModule(log.path),
});

type AuditLogListRow = Omit<
  Prisma.AuditLogGetPayload<{ select: typeof AUDIT_LOG_LIST_SELECT }>,
  'user'
> & {
  sortValue: Date | number;
  userEmail: string | null;
  profileFirstName: string | null;
  profileLastName: string | null;
};

const joinSql = (items: Prisma.Sql[], separator: Prisma.Sql) =>
  items.reduce((query, item, index) =>
    index === 0 ? item : Prisma.sql`${query}${separator}${item}`
  );

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const toAuditSqlTimestamp = (date: Date) => date.toISOString().replace('Z', '');

const auditTimestampSql = (date: Date) =>
  Prisma.sql`${toAuditSqlTimestamp(date)}::timestamp`;

const pathPrefixSql = (prefix: string) => {
  const normalizedPrefix = prefix.toLowerCase();
  return Prisma.sql`(LOWER(l.path) = ${normalizedPrefix} OR LOWER(l.path) LIKE ${`${normalizedPrefix}/%`})`;
};

const buildModuleSqlCondition = (modules: string[]) => {
  if (!modules.length) return undefined;

  const moduleSet = new Set(modules);
  const prefixes = AUDIT_MODULE_ROUTES.filter(route =>
    moduleSet.has(route.module)
  ).flatMap(route => route.prefixes);
  const conditions = prefixes.map(pathPrefixSql);

  if (moduleSet.has('General')) {
    const knownConditions = AUDIT_MODULE_ROUTES.flatMap(route =>
      route.prefixes.map(pathPrefixSql)
    );
    if (knownConditions.length) {
      conditions.push(
        Prisma.sql`NOT (${joinSql(knownConditions, Prisma.sql` OR `)})`
      );
    }
  }

  if (conditions.length) return joinSql(conditions, Prisma.sql` OR `);
  return Prisma.sql`l.path = ${'__audit_module_not_found__'}`;
};

const severityRankSql = Prisma.sql`CASE l.severity
  WHEN 'CRITICAL' THEN 5
  WHEN 'ERROR' THEN 4
  WHEN 'WARNING' THEN 3
  WHEN 'SUCCESS' THEN 2
  WHEN 'INFO' THEN 1
  ELSE 0
END`;

const sortExpressionSql = (sortBy: AuditSortBy) => {
  if (sortBy === 'statusCode') return Prisma.sql`l."statusCode"`;
  if (sortBy === 'responseTime') return Prisma.sql`l."responseTime"`;
  if (sortBy === 'severity') return severityRankSql;
  return Prisma.sql`l."createdAt"`;
};

const resolveCursorOperator = (filters: AuditLogFilters) => {
  const goesForward = filters.direction === 'next';
  const sortsAscending = filters.sortDir === 'asc';
  return goesForward === sortsAscending ? '>' : '<';
};

const resolveQuerySortDir = (filters: AuditLogFilters) => {
  if (filters.direction === 'prev') {
    return filters.sortDir === 'asc' ? 'desc' : 'asc';
  }
  return filters.sortDir;
};

const buildCursorSqlCondition = (filters: AuditLogFilters) => {
  if (!filters.cursorCreatedAt || !filters.cursorId) return undefined;

  const operator = Prisma.raw(resolveCursorOperator(filters));
  if (filters.sortBy === 'createdAt') {
    return Prisma.sql`(
      l."createdAt" ${operator} ${auditTimestampSql(filters.cursorCreatedAt)}
      OR (
        l."createdAt" = ${auditTimestampSql(filters.cursorCreatedAt)}
        AND l.id ${operator} ${filters.cursorId}
      )
    )`;
  }

  const sortExpression = sortExpressionSql(filters.sortBy);
  return Prisma.sql`(
    ${sortExpression} ${operator} ${filters.cursorSortValue}
    OR (
      ${sortExpression} = ${filters.cursorSortValue}
      AND l."createdAt" ${operator} ${auditTimestampSql(
    filters.cursorCreatedAt
  )}
    )
    OR (
      ${sortExpression} = ${filters.cursorSortValue}
      AND l."createdAt" = ${auditTimestampSql(filters.cursorCreatedAt)}
      AND l.id ${operator} ${filters.cursorId}
    )
  )`;
};

const buildListWhereSql = (filters: AuditLogFilters) => {
  const conditions: Prisma.Sql[] = [];

  if (filters.search) {
    const like = `%${escapeLike(filters.search)}%`;
    const searchConditions: Prisma.Sql[] = [
      Prisma.sql`l.action ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`l.path ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`l.method ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`l.severity ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`l."ipAddress" ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`l."userAgent" ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`u.email ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`p."firstName" ILIKE ${like} ESCAPE '\\'`,
      Prisma.sql`p."lastName" ILIKE ${like} ESCAPE '\\'`,
    ];
    const moduleSearchCondition = buildModuleSqlCondition(
      getAuditModulesMatchingSearch(filters.search)
    );
    if (moduleSearchCondition) searchConditions.push(moduleSearchCondition);
    conditions.push(
      Prisma.sql`(${joinSql(searchConditions, Prisma.sql` OR `)})`
    );
  }

  if (filters.userIds?.length) {
    conditions.push(
      Prisma.sql`l."userId" IN (${Prisma.join(filters.userIds)})`
    );
  }
  if (filters.methods?.length) {
    conditions.push(Prisma.sql`l.method IN (${Prisma.join(filters.methods)})`);
  }
  if (filters.modules?.length) {
    const moduleCondition = buildModuleSqlCondition(filters.modules);
    if (moduleCondition) conditions.push(Prisma.sql`(${moduleCondition})`);
  }
  if (filters.severities?.length) {
    conditions.push(
      Prisma.sql`l.severity IN (${Prisma.join(filters.severities)})`
    );
  }
  if (filters.statusCode) {
    conditions.push(Prisma.sql`l."statusCode" = ${filters.statusCode}`);
  }
  if (!filters.statusCode && filters.statusGroups?.length) {
    conditions.push(
      Prisma.sql`(${joinSql(
        filters.statusGroups.map(statusGroup => {
          const group = Number(statusGroup[0]);
          return Prisma.sql`(l."statusCode" >= ${
            group * 100
          } AND l."statusCode" <= ${group * 100 + 99})`;
        }),
        Prisma.sql` OR `
      )})`
    );
  }
  if (filters.from || filters.to || filters.snapshotAt) {
    const upperDate =
      filters.to && filters.to < filters.snapshotAt
        ? filters.to
        : filters.snapshotAt;
    if (filters.from)
      conditions.push(
        Prisma.sql`l."createdAt" >= ${auditTimestampSql(filters.from)}`
      );
    conditions.push(
      Prisma.sql`l."createdAt" <= ${auditTimestampSql(upperDate)}`
    );
  }

  const cursorCondition = buildCursorSqlCondition(filters);
  if (cursorCondition) conditions.push(cursorCondition);

  if (!conditions.length) return Prisma.empty;
  return Prisma.sql`WHERE ${joinSql(conditions, Prisma.sql` AND `)}`;
};

const buildListOrderSql = (filters: AuditLogFilters) => {
  const direction = Prisma.raw(resolveQuerySortDir(filters).toUpperCase());
  const sortExpression = sortExpressionSql(filters.sortBy);
  if (filters.sortBy === 'createdAt') {
    return Prisma.sql`ORDER BY l."createdAt" ${direction}, l.id ${direction}`;
  }
  return Prisma.sql`ORDER BY ${sortExpression} ${direction}, l."createdAt" ${direction}, l.id ${direction}`;
};

const serializeCursor = (
  log:
    | (Pick<
        Prisma.AuditLogGetPayload<{ select: typeof AUDIT_LOG_LIST_SELECT }>,
        'id' | 'createdAt'
      > & { sortValue?: Date | number | null })
    | undefined,
  filters?: Pick<AuditLogFilters, 'sortBy'>
) =>
  log
    ? {
        cursorCreatedAt: log.createdAt.toISOString(),
        cursorId: log.id,
        ...(filters?.sortBy && filters.sortBy !== 'createdAt'
          ? { cursorSortValue: String(log.sortValue ?? 0) }
          : {}),
      }
    : null;

export const getAuditLogCleanupConfig = (env: EnvLike = process.env) => ({
  retentionDays: parsePositiveInteger(
    env.AUDIT_LOG_RETENTION_DAYS,
    DEFAULT_AUDIT_LOG_RETENTION_DAYS
  ),
  batchSize: parsePositiveInteger(
    env.AUDIT_LOG_CLEANUP_BATCH_SIZE,
    DEFAULT_AUDIT_LOG_CLEANUP_BATCH_SIZE
  ),
  maxBatches: parsePositiveInteger(
    env.AUDIT_LOG_CLEANUP_MAX_BATCHES,
    DEFAULT_AUDIT_LOG_CLEANUP_MAX_BATCHES
  ),
});

export const getAuditLogRetentionCutoff = (
  retentionDays = DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  now = new Date()
) => new Date(now.getTime() - retentionDays * MS_PER_DAY);

class AuditLogServices {
  static getCleanupConfig = getAuditLogCleanupConfig;
  static getRetentionCutoff = getAuditLogRetentionCutoff;

  static normalizeFilters(query: QueryLike): AuditLogFilters {
    const sortBy =
      parseEnum<AuditSortBy>(query.sortBy, AUDIT_SORT_FIELDS, 'sortBy') ||
      'createdAt';
    const sortDir =
      parseEnum<AuditSortDir>(
        query.sortDir,
        AUDIT_SORT_DIRECTIONS,
        'sortDir'
      ) || 'desc';
    const direction =
      parseEnum<AuditCursorDirection>(
        query.direction,
        AUDIT_CURSOR_DIRECTIONS,
        'direction'
      ) || 'next';
    const cursorCreatedAt = parseDate(query.cursorCreatedAt, 'cursorCreatedAt');
    const cursorId = parseOptionalInteger(query.cursorId, 'cursorId');
    const cursorSortValue = parseCursorSortValue(query.cursorSortValue, sortBy);
    const hasCursorSortValue =
      optionalString(query.cursorSortValue) !== undefined;

    if ((cursorCreatedAt && !cursorId) || (!cursorCreatedAt && cursorId)) {
      throw new AppError('Cursor incompleto', 400);
    }
    if (hasCursorSortValue && (!cursorCreatedAt || !cursorId)) {
      throw new AppError('Cursor incompleto', 400);
    }
    if (
      sortBy !== 'createdAt' &&
      cursorCreatedAt &&
      cursorId &&
      cursorSortValue === undefined
    ) {
      throw new AppError('Cursor incompleto', 400);
    }

    return {
      limit: parseBoundedInteger(query.limit, 'limit', 25, 1, 100),
      search: optionalString(query.search),
      userIds: parseIntegerList(query.userId, 'userId'),
      methods: parseEnumList<string>(
        query.method,
        AUDIT_METHODS,
        'method',
        value => value.toUpperCase()
      ),
      modules: queryValues(query.module),
      severities: parseEnumList<string>(
        query.severity,
        AUDIT_SEVERITIES,
        'severity',
        value => value.toUpperCase()
      ),
      statusCode: parseOptionalInteger(
        query.statusCode,
        'statusCode',
        100,
        599
      ),
      statusGroups: parseEnumList<AuditStatusGroup>(
        query.statusGroup,
        AUDIT_STATUS_GROUPS,
        'statusGroup'
      ),
      from: parseDate(query.from, 'from'),
      to: parseDate(query.to, 'to', true),
      snapshotAt: parseRequiredDate(query.snapshotAt, 'snapshotAt', new Date()),
      cursorCreatedAt,
      cursorId,
      cursorSortValue,
      direction,
      sortBy,
      sortDir,
    };
  }

  static buildWhere(
    filters: AuditLogFilters,
    options: { includeCursor?: boolean } = {}
  ): Prisma.AuditLogWhereInput {
    const and: Prisma.AuditLogWhereInput[] = [];

    if (filters.search) {
      const contains = {
        contains: filters.search,
        mode: 'insensitive',
      } as const;
      const moduleSearchWhere = getAuditModuleWhere(
        getAuditModulesMatchingSearch(filters.search)
      );
      const searchConditions: Prisma.AuditLogWhereInput[] = [
        { action: contains },
        { path: contains },
        { method: contains },
        { severity: contains },
        { ipAddress: contains },
        { userAgent: contains },
        { user: { is: { email: contains } } },
        { user: { is: { profile: { is: { firstName: contains } } } } },
        { user: { is: { profile: { is: { lastName: contains } } } } },
      ];
      if (moduleSearchWhere) searchConditions.push(moduleSearchWhere);
      and.push({
        OR: searchConditions,
      });
    }

    if (filters.userIds?.length) and.push({ userId: { in: filters.userIds } });
    if (filters.methods?.length) and.push({ method: { in: filters.methods } });
    if (filters.modules?.length) {
      const moduleWhere = getAuditModuleWhere(filters.modules);
      if (moduleWhere) and.push(moduleWhere);
    }
    if (filters.severities?.length) {
      and.push({ severity: { in: filters.severities } });
    }
    if (filters.statusCode) and.push({ statusCode: filters.statusCode });
    if (!filters.statusCode && filters.statusGroups?.length) {
      and.push({
        OR: filters.statusGroups.map(statusGroup => {
          const group = Number(statusGroup[0]);
          return { statusCode: { gte: group * 100, lte: group * 100 + 99 } };
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
    if (options.includeCursor && filters.cursorCreatedAt && filters.cursorId) {
      const cursorOperator =
        filters.direction === 'prev'
          ? { date: 'gt' as const, id: 'gt' as const }
          : { date: 'lt' as const, id: 'lt' as const };
      and.push({
        OR: [
          { createdAt: { [cursorOperator.date]: filters.cursorCreatedAt } },
          {
            createdAt: filters.cursorCreatedAt,
            id: { [cursorOperator.id]: filters.cursorId },
          },
        ],
      });
    }

    return and.length ? { AND: and } : {};
  }

  static async findAll(rawQuery: QueryLike) {
    const filters = this.normalizeFilters(rawQuery);
    const where = buildListWhereSql(filters);
    const orderBy = buildListOrderSql(filters);
    const isPreviousPage = filters.direction === 'prev';
    const rows = await prisma.$queryRaw<AuditLogListRow[]>`
      SELECT
        l.id,
        l."userId",
        l.action,
        l.method,
        l.path,
        l.severity,
        l."statusCode",
        l."responseTime",
        l."ipAddress",
        l."userAgent",
        l.referrer,
        l."createdAt",
        ${sortExpressionSql(filters.sortBy)} AS "sortValue",
        u.email AS "userEmail",
        p."firstName" AS "profileFirstName",
        p."lastName" AS "profileLastName"
      FROM "AuditLog" l
      LEFT JOIN "Users" u ON u.id = l."userId"
      LEFT JOIN "Profiles" p ON p."userId" = u.id
      ${where}
      ${orderBy}
      LIMIT ${filters.limit + 1}
    `;
    const hasOverflow = rows.length > filters.limit;
    const pageRows = rows.slice(0, filters.limit);
    const dataRows = isPreviousPage ? pageRows.reverse() : pageRows;
    const data = dataRows.map(row =>
      withAuditModule({
        id: row.id,
        userId: row.userId,
        action: row.action,
        method: row.method,
        path: row.path,
        severity: row.severity,
        statusCode: row.statusCode,
        responseTime: row.responseTime,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        referrer: row.referrer,
        createdAt: row.createdAt,
        user:
          row.userId && row.userEmail
            ? {
                id: row.userId,
                email: row.userEmail,
                profile:
                  row.profileFirstName || row.profileLastName
                    ? {
                        firstName: row.profileFirstName || '',
                        lastName: row.profileLastName || '',
                      }
                    : null,
              }
            : null,
      })
    );
    const firstLog = dataRows[0];
    const lastLog = dataRows[dataRows.length - 1];

    return {
      data,
      meta: {
        limit: filters.limit,
        snapshotAt: filters.snapshotAt.toISOString(),
        nextCursor: serializeCursor(lastLog, filters),
        prevCursor: serializeCursor(firstLog, filters),
        hasNextPage: isPreviousPage
          ? Boolean(filters.cursorCreatedAt)
          : hasOverflow,
        hasPrevPage: isPreviousPage
          ? hasOverflow
          : Boolean(filters.cursorCreatedAt),
      },
    };
  }

  static async findById(id: number) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      select: AUDIT_LOG_DETAIL_SELECT,
    });

    if (!log) throw new AppError('Log no encontrado', 404);
    return withAuditModule(log);
  }

  static async summary(rawQuery: QueryLike) {
    const filters = this.normalizeFilters(rawQuery);
    const where = this.buildWhere(filters);

    const [
      totalLogs,
      totalErrors,
      activeUsers,
      responseTime,
      logsForDailyStats,
      topModules,
      topUsers,
      topEndpoints,
      statusDistribution,
      recentCriticalActions,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: andWhere(where, { statusCode: { gte: 400 } }),
      }),
      prisma.auditLog.findMany({
        where: andWhere(where, { userId: { not: null } }),
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.auditLog.aggregate({
        where,
        _avg: { responseTime: true },
      }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5000,
        select: { createdAt: true, statusCode: true },
      }),
      this.byModule(rawQuery, 5),
      this.byUser(rawQuery, 5),
      this.byEndpoint(rawQuery, 5),
      this.byStatus(rawQuery),
      prisma.auditLog
        .findMany({
          where: andWhere(where, { severity: 'CRITICAL' }),
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: AUDIT_LOG_LIST_SELECT,
        })
        .then(logs => logs.map(withAuditModule)),
    ]);

    const logsByDayMap = logsForDailyStats.reduce<
      Record<string, { date: string; total: number; errors: number }>
    >((days, log) => {
      const date = formatDateKey(log.createdAt);
      days[date] ||= { date, total: 0, errors: 0 };
      days[date].total += 1;
      if (log.statusCode >= 400) days[date].errors += 1;
      return days;
    }, {});

    return {
      totalLogs,
      totalErrors,
      activeUsers: activeUsers.length,
      averageResponseTime: Math.round(responseTime._avg.responseTime || 0),
      logsByDay: Object.values(logsByDayMap).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      topUsers,
      topModules,
      topEndpoints,
      statusDistribution,
      recentCriticalActions,
    };
  }

  static async byModule(rawQuery: QueryLike, limit = 20) {
    const filters = this.normalizeFilters(rawQuery);
    const where = this.buildWhere(filters);
    const rows = await prisma.auditLog.groupBy({
      by: ['path'],
      where,
      _count: { _all: true },
      _avg: { responseTime: true },
    });
    const modules = new Map<
      string,
      { module: string; count: number; responseTimeTotal: number }
    >();

    rows.forEach(row => {
      const module = getAuditModule(row.path);
      const current = modules.get(module) || {
        module,
        count: 0,
        responseTimeTotal: 0,
      };
      current.count += row._count._all;
      current.responseTimeTotal +=
        Math.round(row._avg.responseTime || 0) * row._count._all;
      modules.set(module, current);
    });

    return Array.from(modules.values())
      .map(row => ({
        module: row.module,
        count: row.count,
        averageResponseTime: Math.round(row.responseTimeTotal / row.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  static async byUser(rawQuery: QueryLike, limit = 20) {
    const filters = this.normalizeFilters(rawQuery);
    const where = this.buildWhere(filters);
    const rows = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: andWhere(where, { userId: { not: null } }),
      _count: { _all: true },
      _avg: { responseTime: true },
    });
    const userIds = rows
      .map(row => row.userId)
      .filter((userId): userId is number => typeof userId === 'number');
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: AUDIT_LOG_USER_SELECT,
    });
    const usersById = new Map(users.map(user => [user.id, user]));

    return rows
      .map(row => ({
        userId: row.userId,
        user: row.userId ? usersById.get(row.userId) || null : null,
        count: row._count._all,
        averageResponseTime: Math.round(row._avg.responseTime || 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  static async byStatus(rawQuery: QueryLike) {
    const filters = this.normalizeFilters(rawQuery);
    const where = this.buildWhere(filters);
    const rows = await prisma.auditLog.groupBy({
      by: ['statusCode'],
      where,
      _count: { _all: true },
    });

    return rows
      .map(row => ({
        statusCode: row.statusCode,
        count: row._count._all,
      }))
      .sort((a, b) => a.statusCode - b.statusCode);
  }

  static async byEndpoint(rawQuery: QueryLike, limit = 20) {
    const filters = this.normalizeFilters(rawQuery);
    const where = this.buildWhere(filters);
    const rows = await prisma.auditLog.groupBy({
      by: ['method', 'path'],
      where,
      _count: { _all: true },
      _avg: { responseTime: true },
    });

    return rows
      .map(row => ({
        method: row.method,
        path: row.path,
        count: row._count._all,
        averageResponseTime: Math.round(row._avg.responseTime || 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  static async cleanupOldLogs({
    retentionDays,
    batchSize,
    maxBatches,
    now,
  }: AuditLogCleanupOptions = {}): Promise<AuditLogCleanupResult> {
    const config = getAuditLogCleanupConfig();
    const resolvedRetentionDays = resolvePositiveInteger(
      retentionDays,
      config.retentionDays
    );
    const resolvedBatchSize = resolvePositiveInteger(
      batchSize,
      config.batchSize
    );
    const resolvedMaxBatches = resolvePositiveInteger(
      maxBatches,
      config.maxBatches
    );
    const cutoff = getAuditLogRetentionCutoff(resolvedRetentionDays, now);
    const { prisma } = await import('@/utils/prisma.server');

    let deletedCount = 0;
    let batches = 0;

    while (batches < resolvedMaxBatches) {
      const deletedRows = await prisma.$queryRaw<{ id: number }[]>`
        WITH expired AS (
          SELECT id
          FROM "AuditLog"
          WHERE "createdAt" < ${cutoff}
          ORDER BY "createdAt" ASC
          LIMIT ${resolvedBatchSize}
        )
        DELETE FROM "AuditLog"
        WHERE id IN (SELECT id FROM expired)
        RETURNING id
      `;

      if (deletedRows.length === 0) break;

      deletedCount += deletedRows.length;
      batches += 1;

      if (deletedRows.length < resolvedBatchSize) break;
    }

    return {
      retentionDays: resolvedRetentionDays,
      batchSize: resolvedBatchSize,
      maxBatches: resolvedMaxBatches,
      cutoff,
      deletedCount,
      batches,
    };
  }
}

export default AuditLogServices;
