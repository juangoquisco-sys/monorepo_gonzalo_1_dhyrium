import { expect, test } from '@playwright/test';

const boardUnit = {
  id: 'unit-1',
  name: 'Gerencia de Estudios',
  codemap: 'OFICINA',
  type: 'OFFICE',
  parentId: null,
  depth: 0,
  path: ['Gerencia de Estudios'],
  metrics: {
    total: 0,
    pending: 0,
    inProgress: 0,
    blocked: 0,
    done: 0,
    rejected: 0,
    notApplicable: 0,
    overdue: 0,
  },
  commitments: [],
  children: [],
};

test('creates a commitment with hierarchical context and unit assignees', async ({
  page,
}) => {
  let createPayload: Record<string, unknown> | null = null;

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/profile')) {
      await route.fulfill({
        json: {
          id: 1,
          email: 'moderador@example.com',
          profile: {
            firstName: 'Usuario',
            lastName: 'Moderador',
            dni: '00000000',
          },
          role: {
            id: 1,
            name: 'MOD',
            menuPoints: [
              {
                id: 1,
                route: 'grupos',
                path: '/grupos',
                title: 'Grupos',
                typeRol: 'MOD',
                menu: [],
              },
            ],
          },
          roleId: 1,
          offices: [],
        },
      });
      return;
    }

    if (path.endsWith('/meeting-units/commitment-board')) {
      await route.fulfill({
        json: { rootMode: 'AUTO_ROOT', units: [boardUnit] },
      });
      return;
    }

    if (path.endsWith('/meeting-units/unit-1/technical-projects')) {
      await route.fulfill({
        json: [
          {
            id: 'focus-1',
            unitId: 'unit-1',
            projectId: 100,
            status: 'ACTIVE',
            isCurrent: true,
            stageFocus: [
              {
                id: 'stage-focus-1',
                unitId: 'unit-1',
                projectId: 100,
                stageId: 200,
                status: 'ACTIVE',
                isCurrent: true,
                stage: { id: 200, name: 'Expediente técnico', status: true },
              },
            ],
            project: {
              id: 100,
              name: 'Proyecto prueba',
              contract: {
                id: 100,
                cui: 'CUI-100',
                projectName: 'Proyecto prueba',
                projectShortName: 'PRUEBA',
              },
              stages: [],
            },
          },
        ],
      });
      return;
    }

    if (path.endsWith('/meeting-units/unit-1/projects/100/stages/200/tree')) {
      await route.fulfill({
        json: {
          id: 300,
          item: '01',
          name: 'Arquitectura',
          level: 1,
          stagesId: 200,
          subTasks: [
            { id: 400, item: '01.01', name: 'Planos', status: 'UNRESOLVED' },
            { id: 401, item: '01.02', name: 'Memoria', status: 'UNRESOLVED' },
          ],
          nextLevel: [],
        },
      });
      return;
    }

    if (path.endsWith('/meeting-units/unit-1/project-moderators')) {
      await route.fulfill({
        json: {
          canManageCurrentUnit: true,
          memberships: [
            {
              id: 'membership-1',
              userId: 7,
              unitId: 'unit-1',
              role: 'ESPECIALISTA',
              isPrimary: true,
              canManageUnitProjects: false,
              user: {
                id: 7,
                email: 'ana@example.com',
                profile: {
                  firstName: 'Ana',
                  lastName: 'Ruiz',
                  job: 'Arquitecta',
                },
              },
            },
          ],
        },
      });
      return;
    }

    if (path.endsWith('/commitments') && request.method() === 'POST') {
      createPayload = request.postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          id: 'commitment-1',
          unitId: 'unit-1',
          title: 'Entregar planos',
          status: 'PENDING',
          priority: 'NORMAL',
          confirmationStatus: 'CONFIRMED',
          origin: 'MANUAL',
        },
      });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.goto('/#/grupos/compromisos');

  await page.getByRole('button', { name: 'Crear compromiso' }).click();
  const title = page.getByPlaceholder('Escribir compromiso y presionar Enter');
  await title.fill('Entregar planos');

  await page.getByRole('button', { name: /Agregar contexto/i }).click();
  await page.getByRole('combobox', { name: 'Etapa del contexto' }).click();
  await page
    .getByRole('option', { name: /PRUEBA — Expediente técnico/i })
    .click();
  await page
    .getByRole('checkbox', { name: 'Seleccionar nivel Arquitectura' })
    .click();
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await page.getByRole('button', { name: 'Elegir encargado' }).click();
  await page.getByText('Ana Ruiz').click();
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await title.press('Enter');
  await expect.poll(() => createPayload).not.toBeNull();
  expect(createPayload).toMatchObject({
    unitId: 'unit-1',
    projectId: 100,
    assignees: [{ userId: 7, role: 'OWNER' }],
    contexts: [
      {
        targetType: 'LEVEL',
        stageId: 200,
        levelId: 300,
        includeChildren: true,
        isPrimary: true,
      },
      {
        targetType: 'TASK',
        stageId: 200,
        subTaskId: 400,
        includeChildren: false,
        isPrimary: false,
      },
      {
        targetType: 'TASK',
        stageId: 200,
        subTaskId: 401,
        includeChildren: false,
        isPrimary: false,
      },
    ],
  });
});
