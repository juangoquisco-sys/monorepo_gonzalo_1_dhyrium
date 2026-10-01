import { expect, test } from '@playwright/test';

test('muestra los entregables debajo de su tarea y abre el archivo correcto', async ({
  page,
}, testInfo) => {
  const profile = {
    id: 73,
    email: 'technical@test.local',
    isSystemUser: false,
    profile: { firstName: 'Usuario', lastName: 'de prueba', dni: '00000073' },
    roleId: 1,
    offices: [],
    role: {
      id: 1,
      name: 'Técnico',
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
  };
  const files = [
    '1.3.1 Plano Clave.dwg',
    '1.3.1 Plano Clave.pdf',
    '1.3.1 Mapa de ubicación.mpk',
  ].map((name, index) => ({
    id: 901 + index,
    name,
    originalname: name,
    dir: 'uploads/tasks',
    type: 'UPLOADS',
  }));
  const task = (id: number, name: string, hasFiles: boolean) => ({
    id,
    assignedAt: '2026-09-10T12:00:00.000Z',
    percentage: 50,
    price: 100,
    taskInfo: {
      id: id + 100,
      item: `1.3.${id}.`,
      name,
      status: 'PROCESS',
      days: 2,
      price: 100,
      updatedAt: '2026-09-10T12:00:00.000Z',
      moderator: profile,
      feedBacks: hasFiles ? [{ files }] : [],
    },
  });
  const launchRequests: unknown[] = [];
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    let status = 200;
    if (path.endsWith('/profile')) body = profile;
    if (path.endsWith('/projects'))
      body = [
        {
          id: 9,
          name: 'Proyecto de prueba',
          stages: [{ id: 32, name: 'Arquitectura' }],
        },
      ];
    if (path.endsWith('/subtasks/report-user/73'))
      body = {
        total: 2,
        data: [
          {
            id: 32,
            projectId: 9,
            name: 'Proyecto de prueba - Arquitectura',
            tasks: [
              task(1, 'Plano clave', true),
              task(2, 'Tarea sin archivos', false),
            ],
          },
        ],
      };
    if (path.endsWith('/desktop/documents/launches')) {
      launchRequests.push(route.request().postDataJSON());
      // Keep the test inside the browser; never launch a native editor.
      status = 413;
      body = {
        message: 'El archivo supera el límite de 160 MB para Dhyrium Desktop.',
        code: 'DESKTOP_DOCUMENT_FILE_TOO_LARGE',
      };
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('/#/mis-tareas/tecnicas?limit=50&page=0');
  const list = page.getByRole('list', {
    name: 'Archivos entregables de Plano clave',
  });
  await expect(list).toBeVisible();
  await expect(list.getByRole('button')).toHaveCount(3);
  await expect(
    page.getByRole('list', {
      name: 'Archivos entregables de Tarea sin archivos',
    })
  ).toHaveCount(0);
  const cell = page.getByRole('cell').filter({ has: list });
  await expect(cell).toContainText('1.3.1. Plano clave');
  const titleBounds = await cell
    .locator('.tablePersonalTask-task-name')
    .boundingBox();
  const listBounds = await list.boundingBox();
  expect(listBounds!.y).toBeGreaterThan(titleBounds!.y + titleBounds!.height);
  await expect(list.locator('img').first()).toHaveAttribute(
    'src',
    '/svg/autocad-icon.svg'
  );
  await page.screenshot({
    path: testInfo.outputPath('mis-tareas-entregables.png'),
    fullPage: true,
  });
  const desktopButton = list.getByRole('button', {
    name: 'Abrir 1.3.1 Mapa de ubicación.mpk con Dhyrium Desktop',
    exact: true,
  });
  await desktopButton.click();
  await expect
    .poll(() => launchRequests)
    .toEqual([{ sourceKind: 'TASK_FILE', sourceFileId: 903 }]);
  await expect(
    page.getByText(
      'El archivo supera el límite de 160 MB para Dhyrium Desktop.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(desktopButton).toBeEnabled();
  await expect(page).toHaveURL(/mis-tareas\/tecnicas\?limit=50&page=0$/);
});
