import assert from 'node:assert/strict';
import test from 'node:test';
import AuditLogServices from '@/services/auditLog.services';
import { getAuditModuleWhere } from '@/utils/auditModuleMapper';
import { prisma } from '@/utils/prisma.server';

test.describe('AuditLog cursor filters', () => {
  test.after(async () => {
    await prisma.$disconnect();
  });

  test('normalizes snapshot and cursor params', () => {
    const filters = AuditLogServices.normalizeFilters({
      limit: '50',
      snapshotAt: '2026-06-17T15:00:00.000Z',
      cursorCreatedAt: '2026-06-17T14:00:00.000Z',
      cursorId: '10',
      direction: 'next',
    });

    assert.equal(filters.limit, 50);
    assert.equal(filters.snapshotAt.toISOString(), '2026-06-17T15:00:00.000Z');
    assert.equal(
      filters.cursorCreatedAt?.toISOString(),
      '2026-06-17T14:00:00.000Z'
    );
    assert.equal(filters.cursorId, 10);
    assert.equal(filters.direction, 'next');
    assert.equal(filters.sortBy, 'createdAt');
    assert.equal(filters.sortDir, 'desc');
  });

  test('normalizes remote sort params and cursor sort values', () => {
    const filters = AuditLogServices.normalizeFilters({
      sortBy: 'responseTime',
      sortDir: 'asc',
      snapshotAt: '2026-06-17T15:00:00.000Z',
      cursorCreatedAt: '2026-06-17T14:00:00.000Z',
      cursorId: '10',
      cursorSortValue: '245',
    });

    assert.equal(filters.sortBy, 'responseTime');
    assert.equal(filters.sortDir, 'asc');
    assert.equal(filters.cursorSortValue, 245);
  });

  test('normalizes comma-separated multi-value filters', () => {
    const filters = AuditLogServices.normalizeFilters({
      method: 'get,POST',
      module: 'Centro de usuarios,Auditoría',
      severity: 'error,CRITICAL',
      statusGroup: '4xx,5xx',
      userId: '1,2,3',
    });

    assert.deepEqual(filters.methods, ['GET', 'POST']);
    assert.deepEqual(filters.modules, ['Centro de usuarios', 'Auditoría']);
    assert.deepEqual(filters.severities, ['ERROR', 'CRITICAL']);
    assert.deepEqual(filters.statusGroups, ['4xx', '5xx']);
    assert.deepEqual(filters.userIds, [1, 2, 3]);
  });

  test('normalizes repeated multi-value query params', () => {
    const filters = AuditLogServices.normalizeFilters({
      method: ['GET', 'POST'],
      userId: ['1', '2'],
    });

    assert.deepEqual(filters.methods, ['GET', 'POST']);
    assert.deepEqual(filters.userIds, [1, 2]);
  });

  test('rejects invalid values inside multi-value filters', () => {
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          method: 'GET,INVALID',
        }),
      /Parametro method invalido/
    );
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          userId: '1,nope',
        }),
      /Parametro userId invalido/
    );
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          sortBy: 'module',
        }),
      /Parametro sortBy invalido/
    );
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          sortDir: 'oldest',
        }),
      /Parametro sortDir invalido/
    );
  });

  test('rejects incomplete cursors', () => {
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          cursorCreatedAt: '2026-06-17T14:00:00.000Z',
        }),
      /Cursor incompleto/
    );
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          cursorId: '10',
        }),
      /Cursor incompleto/
    );
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          sortBy: 'statusCode',
          cursorCreatedAt: '2026-06-17T14:00:00.000Z',
          cursorId: '10',
        }),
      /Cursor incompleto/
    );
    assert.throws(
      () =>
        AuditLogServices.normalizeFilters({
          sortBy: 'severity',
          cursorSortValue: '5',
        }),
      /Cursor incompleto/
    );
  });

  test('uses snapshot as an upper date bound without overriding an earlier to date', () => {
    const filters = AuditLogServices.normalizeFilters({
      snapshotAt: '2026-06-17T15:00:00.000Z',
      to: '2026-06-16',
    });
    const where = AuditLogServices.buildWhere(filters) as {
      AND: { createdAt?: { lte?: Date } }[];
    };
    const createdAtFilter = where.AND.find(condition => condition.createdAt);
    const expectedTo = new Date('2026-06-16T00:00:00');
    expectedTo.setHours(23, 59, 59, 999);

    assert.equal(
      createdAtFilter?.createdAt?.lte?.toISOString(),
      expectedTo.toISOString()
    );
  });

  test('builds next and previous cursor predicates with stable id tie-breakers', () => {
    const cursorCreatedAt = '2026-06-17T14:00:00.000Z';
    const nextWhere = AuditLogServices.buildWhere(
      AuditLogServices.normalizeFilters({
        snapshotAt: '2026-06-17T15:00:00.000Z',
        cursorCreatedAt,
        cursorId: '10',
        direction: 'next',
      }),
      { includeCursor: true }
    ) as { AND: { OR?: unknown[] }[] };
    const prevWhere = AuditLogServices.buildWhere(
      AuditLogServices.normalizeFilters({
        snapshotAt: '2026-06-17T15:00:00.000Z',
        cursorCreatedAt,
        cursorId: '10',
        direction: 'prev',
      }),
      { includeCursor: true }
    ) as { AND: { OR?: unknown[] }[] };

    assert.deepEqual(nextWhere.AND.at(-1), {
      OR: [
        { createdAt: { lt: new Date(cursorCreatedAt) } },
        { createdAt: new Date(cursorCreatedAt), id: { lt: 10 } },
      ],
    });
    assert.deepEqual(prevWhere.AND.at(-1), {
      OR: [
        { createdAt: { gt: new Date(cursorCreatedAt) } },
        { createdAt: new Date(cursorCreatedAt), id: { gt: 10 } },
      ],
    });
  });

  test('builds multi-value filter predicates with OR inside status groups', () => {
    const where = AuditLogServices.buildWhere(
      AuditLogServices.normalizeFilters({
        method: 'GET,POST',
        module: 'Centro de usuarios,Auditoría',
        severity: 'ERROR,CRITICAL',
        statusGroup: '4xx,5xx',
        userId: '1,2',
      })
    ) as { AND: unknown[] };

    assert.deepEqual(where.AND.slice(0, 5), [
      { userId: { in: [1, 2] } },
      { method: { in: ['GET', 'POST'] } },
      getAuditModuleWhere(['Centro de usuarios', 'Auditoría']),
      { severity: { in: ['ERROR', 'CRITICAL'] } },
      {
        OR: [
          { statusCode: { gte: 400, lte: 499 } },
          { statusCode: { gte: 500, lte: 599 } },
        ],
      },
    ]);
  });

  test(
    'keeps recent rows when raw SQL snapshot uses UTC timestamp wall time',
    { skip: !process.env.DATABASE_URL },
    async () => {
      const marker = `audit-timezone-${Date.now()}`;
      const snapshot = new Date();
      const recentCreatedAt = new Date(snapshot.getTime() - 60_000);
      const oldCreatedAt = new Date(snapshot.getTime() - 6 * 60 * 60 * 1000);

      const oldLog = await prisma.auditLog.create({
        data: {
          action: `GET /${marker}/old`,
          method: 'GET',
          path: `/${marker}/old`,
          statusCode: 200,
          responseTime: 1,
          severity: 'INFO',
          createdAt: oldCreatedAt,
        },
      });
      const recentLog = await prisma.auditLog.create({
        data: {
          action: `GET /${marker}/recent`,
          method: 'GET',
          path: `/${marker}/recent`,
          statusCode: 200,
          responseTime: 1,
          severity: 'INFO',
          createdAt: recentCreatedAt,
        },
      });

      try {
        const result = await AuditLogServices.findAll({
          limit: '5',
          search: marker,
          snapshotAt: snapshot.toISOString(),
        });

        assert.equal(result.data[0]?.id, recentLog.id);
        assert.equal(
          result.data.some(log => log.id === oldLog.id),
          true
        );
      } finally {
        await prisma.auditLog.deleteMany({
          where: { path: { startsWith: `/${marker}` } },
        });
      }
    }
  );
});
