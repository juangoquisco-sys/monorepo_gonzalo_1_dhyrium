import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import AppError from '@/utils/appError';
import { UserType } from '@/middlewares/auth.middleware';
import {
  verifyMailAccessByMessageId,
  verifyMailAccessByMessageIds,
  verifyMailAccessFromQuery,
  verifyMailBodyCategory,
} from '@/middlewares/mail.middleware';
import MailServices from '@/services/mail.services';
import MailControllers from '@/controllers/mail.controllers';
import { CategoryMailType } from '@/types/types';

type TestResponse = Response & { responseBody?: unknown };

const createUser = (subMenus: string[]): UserType =>
  ({
    id: 234,
    role: {
      name: 'ROL DE PRUEBA',
      menuPoints: [
        {
          route: 'tramites',
          typeRol: 'MOD',
          menu: subMenus.map(route => ({ route, typeRol: 'MOD' })),
        },
      ],
    },
  } as unknown as UserType);

const createRequest = ({
  query = {},
  params = {},
  body,
}: {
  query?: Record<string, unknown>;
  params?: Record<string, string>;
  body?: unknown;
}): Request =>
  ({
    query,
    params,
    body,
  } as unknown as Request);

const createResponse = (userInfo: UserType): TestResponse => {
  const response: {
    locals: { userInfo: UserType };
    statusCode: number;
    responseBody?: unknown;
    status(code: number): unknown;
    json(payload: unknown): unknown;
  } = {
    locals: { userInfo },
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.responseBody = payload;
      return this;
    },
  };
  return response as unknown as TestResponse;
};

const next: NextFunction = () => undefined;

const assertAppError = (statusCode: number) => (error: unknown) =>
  error instanceof AppError && error.statusCode === statusCode;

const authorizeQueryAndRunListController = async (
  category: CategoryMailType,
  expectedSubMenu: string
) => {
  const user = createUser([expectedSubMenu]);
  const req = createRequest({
    query: { category, type: 'SENDER', limit: '50', page: '0' },
    body: undefined,
  });
  const res = createResponse(user);

  await verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next);
  assert.equal(res.locals.mailCategory, category);

  const originalGetByUser = MailServices.getByUser;
  let serviceCategory: CategoryMailType | undefined;
  MailServices.getByUser = (async (
    _user,
    receivedCategory
  ): Promise<{ total: number; mailList: never[] }> => {
    serviceCategory = receivedCategory;
    return { total: 0, mailList: [] };
  }) as typeof MailServices.getByUser;

  try {
    await new MailControllers().showMessages(req, res, next);
  } finally {
    MailServices.getByUser = originalGetByUser;
  }

  assert.equal(serviceCategory, category);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.responseBody, { total: 0, mailList: [] });
};

test.describe('Mail category authorization', { concurrency: false }, () => {
  test('GET /mail with DIRECT checks tramite-regular and passes DIRECT to the service', async () => {
    await authorizeQueryAndRunListController('DIRECT', 'tramite-regular');
  });

  test('GET /mail with GLOBAL checks comunicado and passes GLOBAL to the service', async () => {
    await authorizeQueryAndRunListController('GLOBAL', 'comunicado');
  });

  test('GET /mail without category returns 400 instead of a TypeError', async () => {
    const req = createRequest({ body: undefined });
    const res = createResponse(createUser(['tramite-regular', 'comunicado']));

    await assert.rejects(
      () => verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next),
      assertAppError(400)
    );
  });

  test('rejects unknown and non-scalar categories with 400', async () => {
    const res = createResponse(createUser(['tramite-regular', 'comunicado']));

    for (const category of ['NORMAL', ['DIRECT']]) {
      const req = createRequest({ query: { category }, body: undefined });
      await assert.rejects(
        () => verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next),
        assertAppError(400)
      );
    }
  });

  test('Express 5 requests with undefined body never read body for query authorization', async () => {
    const req = createRequest({
      query: { category: 'DIRECT' },
      body: undefined,
    });
    const res = createResponse(createUser(['tramite-regular']));

    await verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next);
    assert.equal(res.locals.mailCategory, 'DIRECT');
  });

  test('message detail authorization uses the stored DIRECT category', async () => {
    const originalGetCategoryById = MailServices.getCategoryById;
    MailServices.getCategoryById = async () => 'DIRECT';
    const req = createRequest({ params: { id: '10' }, body: undefined });
    const res = createResponse(createUser(['tramite-regular']));

    try {
      await verifyMailAccessByMessageId(['USER', 'MOD'])(req, res, next);
    } finally {
      MailServices.getCategoryById = originalGetCategoryById;
    }

    assert.equal(res.locals.mailCategory, 'DIRECT');
    assert.equal(res.locals.mailMessageId, 10);
  });

  test('message detail authorization uses the stored GLOBAL category', async () => {
    const originalGetCategoryById = MailServices.getCategoryById;
    MailServices.getCategoryById = async () => 'GLOBAL';
    const req = createRequest({ params: { id: '11' }, body: undefined });
    const res = createResponse(createUser(['comunicado']));

    try {
      await verifyMailAccessByMessageId(['USER', 'MOD'])(req, res, next);
    } finally {
      MailServices.getCategoryById = originalGetCategoryById;
    }

    assert.equal(res.locals.mailCategory, 'GLOBAL');
    assert.equal(res.locals.mailMessageId, 11);
  });

  test('creation accepts matching query and multipart body categories', async () => {
    for (const [category, subMenu] of [
      ['DIRECT', 'tramite-regular'],
      ['GLOBAL', 'comunicado'],
    ] as const) {
      const req = createRequest({
        query: { category },
        body: undefined,
      });
      const res = createResponse(createUser([subMenu]));

      await verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next);
      req.body = { category, data: JSON.stringify({}) };
      await verifyMailBodyCategory(req, res, next);

      const originalCreate = MailServices.create;
      let serviceCategory: CategoryMailType | undefined;
      MailServices.create = (async (
        _data: Parameters<typeof MailServices.create>[0],
        receivedCategory: Parameters<typeof MailServices.create>[1]
      ) => {
        serviceCategory = receivedCategory;
        return { id: 1 };
      }) as unknown as typeof MailServices.create;
      const controller = new MailControllers();
      Object.defineProperty(controller, 'requestFiles', {
        value: () => [],
      });

      try {
        await controller.createMessage(req, res, next);
      } finally {
        MailServices.create = originalCreate;
      }

      assert.equal(res.locals.mailCategory, category);
      assert.equal(serviceCategory, category);
    }
  });

  test('creation rejects a DIRECT query with a GLOBAL multipart body', async () => {
    const req = createRequest({
      query: { category: 'DIRECT' },
      body: undefined,
    });
    const res = createResponse(createUser(['tramite-regular']));

    await verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next);
    req.body = { category: 'GLOBAL' };
    await assert.rejects(
      () => verifyMailBodyCategory(req, res, next),
      assertAppError(400)
    );
  });

  test('DIRECT-only users cannot list or create GLOBAL messages', async () => {
    const user = createUser(['tramite-regular']);

    for (const operation of ['list', 'create']) {
      const req = createRequest({
        query: { category: 'GLOBAL' },
        body: undefined,
      });
      const res = createResponse(user);
      await assert.rejects(
        () => verifyMailAccessFromQuery(['USER', 'MOD'])(req, res, next),
        assertAppError(403),
        operation
      );
    }
  });

  test('DIRECT-only users cannot open or modify stored GLOBAL messages', async () => {
    const originalGetCategoryById = MailServices.getCategoryById;
    MailServices.getCategoryById = async () => 'GLOBAL';
    const user = createUser(['tramite-regular']);

    try {
      for (const operation of ['open', 'modify']) {
        const req = createRequest({
          params: { id: '15' },
          body: undefined,
        });
        const res = createResponse(user);
        await assert.rejects(
          () => verifyMailAccessByMessageId(['USER', 'MOD'])(req, res, next),
          assertAppError(403),
          operation
        );
      }
    } finally {
      MailServices.getCategoryById = originalGetCategoryById;
    }
  });

  test('bulk archive returns 404 when one or more IDs do not exist', async () => {
    const originalGetCategoriesByIds = MailServices.getCategoriesByIds;
    MailServices.getCategoriesByIds = async () => {
      throw new AppError('Uno o más trámites no existen', 404);
    };
    const req = createRequest({ body: { ids: [1, 999] } });
    const res = createResponse(createUser(['tramite-regular', 'comunicado']));

    try {
      await assert.rejects(
        () => verifyMailAccessByMessageIds(['MOD'])(req, res, next),
        assertAppError(404)
      );
    } finally {
      MailServices.getCategoriesByIds = originalGetCategoriesByIds;
    }
  });

  test('bulk archive rejects categories for which MOD has no access', async () => {
    const originalGetCategoriesByIds = MailServices.getCategoriesByIds;
    MailServices.getCategoriesByIds = async () => [
      { id: 1, category: 'DIRECT' },
      { id: 2, category: 'GLOBAL' },
    ];
    const req = createRequest({ body: { ids: [1, 2] } });
    const res = createResponse(createUser(['tramite-regular']));

    try {
      await assert.rejects(
        () => verifyMailAccessByMessageIds(['MOD'])(req, res, next),
        assertAppError(403)
      );
    } finally {
      MailServices.getCategoriesByIds = originalGetCategoriesByIds;
    }
  });

  test('bulk archive validates that IDs are positive integers', async () => {
    const req = createRequest({ body: { ids: [1, '2'] } });
    const res = createResponse(createUser(['tramite-regular']));

    await assert.rejects(
      () => verifyMailAccessByMessageIds(['MOD'])(req, res, next),
      assertAppError(400)
    );
  });
});
