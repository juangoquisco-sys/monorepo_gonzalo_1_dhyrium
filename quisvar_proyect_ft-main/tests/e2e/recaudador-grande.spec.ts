import { expect, test, type Page, type Route } from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';

const profile = {
  id: 73,
  email: 'recaudador@test.local',
  isSystemUser: false,
  profile: {
    firstName: 'Diego',
    lastName: 'Romani',
    dni: '00000073',
    phone: '999999999',
    degree: 'Ingeniero',
  },
  role: {
    id: 1,
    name: 'Moderador',
    menuPoints: [
      {
        id: 1,
        route: 'mis-tareas',
        path: '/mis-tareas',
        title: 'Mis tareas',
        typeRol: 'MOD',
        menu: [
          {
            id: 2,
            route: 'tecnicas',
            path: '/mis-tareas/tecnicas',
            title: 'Técnicas',
            typeRol: 'MOD',
          },
        ],
      },
    ],
  },
  roleId: 1,
  offices: [],
};

const stage = {
  id: 32,
  name: 'Estructuras',
  updatedAt: '2026-08-09T14:00:00.000Z',
  project: {
    id: 9,
    name: 'IEI N° 058 CP Progreso Asillo',
    contract: { cui: '2388403' },
  },
  totalTasks: 3,
  reviewedTasks: 3,
  doneTasks: 0,
  pendingTasks: 0,
  stageStatus: 'READY_FOR_CONFORMITY',
  canGrantConformity: true,
  isEligibleForLiquidation: false,
};

const scopeItem = {
  subTaskId: 9641,
  stageId: 32,
  levelId: 122,
  taskName: 'Memoria de cálculo bloque B',
  item: '1.2.2.2',
  finishedAt: '2026-08-08T14:00:00.000Z',
  sourceSubTaskOnUserIds: [91],
  participationPercentage: 100,
  taskBaseAmount: 330,
  userGrossAmount: 330,
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const mockApi = async (page: Page) => {
  let conformityRequests = 0;
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, '');

    if (path.endsWith('/profile')) return json(route, profile);
    if (path.endsWith('/projects')) {
      return json(route, [
        {
          id: 9,
          name: stage.project.name,
          stages: [{ id: 32, name: 'Estructuras' }],
        },
      ]);
    }
    if (path.endsWith('/liquidations/pre-stages')) return json(route, [stage]);
    if (path.endsWith('/liquidations/pre-stages/32/tasks')) {
      return json(route, {
        stage: {
          id: 32,
          name: 'Estructuras',
          projectId: 9,
          projectName: stage.project.name,
          cui: '2388403',
        },
        summary: {
          totalTasks: 3,
          reviewedTasks: 3,
          doneTasks: 0,
          pendingTasks: 0,
          stageStatus: 'READY_FOR_CONFORMITY',
          canGrantConformity: true,
          isEligibleForLiquidation: false,
        },
        tasks: [
          {
            id: 9641,
            name: scopeItem.taskName,
            item: scopeItem.item,
            status: 'REVIEWED',
            updatedAt: '2026-08-09T14:00:00.000Z',
            reviewedAt: '2026-08-09T14:00:00.000Z',
            days: 3,
            price: 330,
            levelId: 122,
            stageId: 32,
            participationPercentage: 100,
            assignedAt: '2026-08-01T14:00:00.000Z',
            finishedAt: scopeItem.finishedAt,
          },
        ],
      });
    }
    if (
      path.endsWith('/liquidations/pre-stages/32/grant-conformity') &&
      request.method() === 'POST'
    ) {
      conformityRequests += 1;
      return json(route, { success: true });
    }
    if (path.endsWith('/liquidations/eligible-stages')) {
      return json(route, [
        {
          id: 32,
          name: 'Estructuras',
          updatedAt: stage.updatedAt,
          eligibleLevelCount: 1,
          project: {
            id: 9,
            name: stage.project.name,
            contract: { cui: '2388403' },
          },
        },
      ]);
    }
    if (path.endsWith('/liquidations/preview/32')) {
      return json(route, {
        scopeType: 'STAGE',
        scopeRefId: 32,
        userId: 73,
        grossAmount: 330,
        items: [scopeItem],
        snapshot: { grossAmount: 330, items: [scopeItem] },
      });
    }
    return json(route, []);
  });
  return {
    get conformityRequests() {
      return conformityRequests;
    },
  };
};

test.describe('Recaudador Grande', () => {
  test('integra pre-liquidación, conformidad y vista previa sin overflow global', async ({
    page,
  }) => {
    const state = await mockApi(page);
    await page.goto(
      `${APP_URL}/#/mis-tareas/tecnicas/recaudador-grande/pre-liquidacion`
    );

    await expect(
      page.getByRole('heading', { name: 'Recaudador Grande' })
    ).toBeVisible();
    await expect(
      page.getByText(/IEI N° 058 CP Progreso Asillo · CUI 2388403/)
    ).toBeVisible();
    await page.getByRole('button', { name: /Ver tareas/i }).click();

    await expect(page.getByText('Listado de tareas')).toBeVisible();
    await expect(page.getByText(/Memoria de cálculo bloque B/i)).toBeVisible();
    await page.getByRole('button', { name: 'Dar conformidad' }).click();
    await expect.poll(() => state.conformityRequests).toBe(1);

    await page.getByRole('link', { name: 'Nueva liquidación' }).click();
    await page.getByLabel('Etapa a liquidar').selectOption('32');
    await expect(page.getByText('1. Sustento de liquidación')).toBeVisible();
    await expect(page.getByText('S/. 330.00').last()).toBeVisible();

    const hasGlobalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasGlobalOverflow).toBe(false);
  });
});
