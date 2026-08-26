import { expect, test, type Page, type Route } from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';

const profile = {
  id: 99,
  email: 'admin@test.local',
  status: true,
  profile: { firstName: 'Admin', lastName: 'Asistencia' },
  role: {
    id: 1,
    name: 'Administrador',
    menuPoints: [
      {
        id: 1,
        name: 'Control asistencia',
        route: 'control-asistencia',
        typeRol: 'MOD',
        menu: [{ id: 2, name: 'Registro', route: 'registro', typeRol: 'MOD' }],
      },
    ],
  },
  offices: [],
  userType: 'REGULAR',
};

const lookupUsers = [
  {
    id: 10,
    name: 'Ana Prueba',
    email: 'ana@test.local',
    status: true,
    userType: 'REGULAR',
    dni: '70000010',
    phone: '900000010',
  },
  {
    id: 20,
    name: 'Bruno Prueba',
    email: 'bruno@test.local',
    status: true,
    userType: 'REGULAR',
    dni: '70000020',
    phone: '900000020',
  },
];

const participant = (usersId: number, status = 'SIMPLE') => ({
  usersId,
  listId: 41,
  status,
  statusSource: 'SYSTEM_DEFAULT',
  assignedAt: '2026-08-05T13:00:00.000Z',
  biometricMarkedAt: null,
  biometricVerifyMode: null,
  biometricDeviceSerial: null,
  user: {
    id: usersId,
    email: lookupUsers.find(user => user.id === usersId)?.email ?? '',
    profile: {
      firstName: lookupUsers.find(user => user.id === usersId)?.name ?? '',
      lastName: '',
      dni: lookupUsers.find(user => user.id === usersId)?.dni ?? '',
      phone: lookupUsers.find(user => user.id === usersId)?.phone ?? '',
      room: null,
      userPc: null,
    },
  },
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

type AttendanceApiState = {
  listDate: string | null;
  list: {
    id: number;
    title: string;
    timer: string;
    position: number;
    captureMode: 'MANUAL' | 'BIOMETRIC';
    state: 'OPEN' | 'REVIEW' | 'FINALIZED';
    openedAt: string;
    closedAt: string | null;
    finalizedAt: string | null;
    createdAt: string;
    users: ReturnType<typeof participant>[];
  };
  batchBodies: Array<{
    batchId: string;
    changes: Array<{ userId: number; status: string; reason?: string }>;
  }>;
  operations: string[];
  failNextBatch: boolean;
  batchResponseDelayMs: number;
  currentAttendance: Record<string, unknown> | null;
};

const mockAttendanceApi = async (page: Page) => {
  const state: AttendanceApiState = {
    listDate: null,
    list: {
      id: 41,
      title: 'Primer llamado',
      timer: '08:00',
      position: 1,
      captureMode: 'MANUAL',
      state: 'OPEN',
      openedAt: '2026-08-05T13:00:00.000Z',
      closedAt: null,
      finalizedAt: null,
      createdAt: '2026-08-05T13:00:00.000Z',
      users: [participant(10), participant(20)],
    },
    batchBodies: [],
    operations: [],
    failNextBatch: false,
    batchResponseDelayMs: 0,
    currentAttendance: {
      listId: 41,
      title: 'Primer llamado',
      timer: '08:00',
      captureMode: 'MANUAL',
      state: 'OPEN',
      openedAt: '2026-08-05T13:00:00.000Z',
      finalizedAt: null,
      status: 'SIMPLE',
      statusSource: 'SYSTEM_DEFAULT',
      biometricMarkedAt: null,
      provisional: true,
      definitive: false,
    },
  };

  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, '');
    const method = request.method();

    if (path.endsWith('/profile')) return json(route, profile);
    if (path.endsWith('/list/pending')) {
      return json(route, state.list.state === 'FINALIZED' ? null : state.list);
    }
    if (path.endsWith('/list/attendance/current')) {
      return json(route, { attendance: state.currentAttendance });
    }
    if (path.endsWith('/list/attendance') && method === 'GET') {
      const requestedDate = new URL(request.url()).searchParams.get(
        'startDate'
      );
      return json(
        route,
        state.listDate === null || requestedDate === state.listDate
          ? [state.list]
          : []
      );
    }
    if (path.endsWith('/list/41/attendance/batch') && method === 'PATCH') {
      const body =
        request.postDataJSON() as AttendanceApiState['batchBodies'][number];
      state.batchBodies.push(body);
      state.operations.push('batch');
      if (state.failNextBatch) {
        state.failNextBatch = false;
        return json(route, { message: 'Batch rechazado' }, 400);
      }
      if (state.batchResponseDelayMs) {
        await new Promise(resolve =>
          setTimeout(resolve, state.batchResponseDelayMs)
        );
      }
      const canonical = body.changes.map(change => {
        const row = state.list.users.find(
          item => item.usersId === change.userId
        )!;
        row.status = change.status;
        row.statusSource =
          state.list.captureMode === 'MANUAL' &&
          row.statusSource === 'SYSTEM_DEFAULT'
            ? 'MANUAL'
            : 'MANUAL_CORRECTION';
        return {
          userId: row.usersId,
          status: row.status,
          statusSource: row.statusSource,
          biometricMarkedAt: row.biometricMarkedAt,
        };
      });
      return json(route, {
        batchId: body.batchId,
        listId: state.list.id,
        participants: canonical,
      });
    }
    if (path.endsWith('/list/41/finalize') && method === 'POST') {
      state.operations.push('finalize');
      state.list.state = 'FINALIZED';
      state.list.finalizedAt = '2026-08-05T14:00:00.000Z';
      return json(route, state.list);
    }
    return json(route, []);
  });
  return state;
};

const openAttendance = async (page: Page) => {
  await page.goto(`${APP_URL}/#/control-asistencia/registro`);
  await page.clock.fastForward(1);
  await expect(page.getByText('Lista en edición')).toBeVisible();
};

test.describe('flujo unificado de asistencia', () => {
  test('permite ir a una lista activa de una fecha anterior', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-08-05T09:00:00-05:00') });
    const state = await mockAttendanceApi(page);
    state.listDate = '2026-08-04';
    state.list.createdAt = '2026-08-04T13:00:00.000Z';
    state.list.openedAt = '2026-08-04T13:00:00.000Z';

    await page.goto(`${APP_URL}/#/control-asistencia/registro`);
    await page.clock.fastForward(1);

    const addListButton = page.getByRole('button', { name: 'Añadir lista' });
    await expect(addListButton).toBeVisible();
    await expect(addListButton).toBeEnabled();
    await addListButton.click();

    const dialog = page.getByRole('dialog', {
      name: 'Lista de asistencia activa',
    });
    await expect(dialog).toContainText(
      'Existe una lista activa de una fecha anterior'
    );
    await dialog.getByRole('button', { name: 'Ir a la lista activa' }).click();

    await expect(page.locator('input[type="date"]').first()).toHaveValue(
      '2026-08-04'
    );
    await expect(page.getByText('Lista en edición')).toBeVisible();
  });

  test('debouncea, deduplica, revierte fallos y hace flush antes de finalizar', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-08-05T09:00:00-05:00') });
    const state = await mockAttendanceApi(page);
    await openAttendance(page);

    const ana = page
      .locator('.attendanceList-container')
      .filter({ hasText: 'Ana Prueba' });
    const bruno = page
      .locator('.attendanceList-container')
      .filter({ hasText: 'Bruno Prueba' });
    await ana.locator('input[value="TARDE"]').click();
    await page.clock.fastForward(700);
    await ana.locator('input[value="GRAVE"]').click();
    await bruno.locator('input[value="PUNTUAL"]').click();
    await expect(ana.locator('input[value="GRAVE"]')).toBeChecked();
    await page.clock.fastForward(999);
    expect(state.batchBodies).toHaveLength(0);
    await page.clock.fastForward(1);
    await expect.poll(() => state.batchBodies.length).toBe(1);
    expect(state.batchBodies[0].changes).toEqual([
      { userId: 10, status: 'GRAVE' },
      { userId: 20, status: 'PUNTUAL' },
    ]);

    state.failNextBatch = true;
    await bruno.locator('input[value="TARDE"]').click();
    await expect(bruno.locator('input[value="TARDE"]')).toBeChecked();
    await page.clock.fastForward(1_000);
    await expect.poll(() => state.batchBodies.length).toBe(2);
    await expect(bruno.locator('input[value="PUNTUAL"]')).toBeChecked();
    await expect(
      page.getByText(/Se restauraron los últimos estados/)
    ).toBeVisible();

    await ana.locator('input[value="TARDE"]').click();
    state.batchResponseDelayMs = 250;
    const finalizeButton = page.getByRole('button', {
      name: 'Finalizar lista',
    });
    await finalizeButton.click();
    await expect(finalizeButton).toBeDisabled();
    await expect(finalizeButton).toHaveText('Finalizar lista');
    await expect
      .poll(() => state.operations.slice(-2))
      .toEqual(['batch', 'finalize']);
    expect(state.batchBodies.at(-1)?.changes).toEqual([
      { userId: 10, status: 'TARDE' },
    ]);
  });

  test('confirma el batch pendiente antes de cambiar de fecha', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-08-05T09:00:00-05:00') });
    const state = await mockAttendanceApi(page);
    await openAttendance(page);

    const ana = page
      .locator('.attendanceList-container')
      .filter({ hasText: 'Ana Prueba' });
    await ana.locator('input[value="GRAVE"]').click();
    await page.locator('input[type="date"]').first().fill('2026-08-04');

    await expect.poll(() => state.batchBodies.length).toBe(1);
    expect(state.batchBodies[0].changes).toEqual([
      { userId: 10, status: 'GRAVE' },
    ]);
    await expect(page.getByText('Seleccione una Lista')).toBeVisible();
  });

  test('solicita motivo biométrico y conserva el cierre local del resultado final', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-08-05T09:00:00-05:00') });
    const state = await mockAttendanceApi(page);
    state.list.captureMode = 'BIOMETRIC';
    state.list.state = 'REVIEW';
    state.list.users[0] = {
      ...state.list.users[0],
      status: 'PUNTUAL',
      statusSource: 'BIOMETRIC',
      biometricMarkedAt: '2026-08-05T13:02:03.000Z',
    };
    state.currentAttendance = {
      listId: 41,
      title: 'Primer llamado',
      timer: '08:00',
      captureMode: 'BIOMETRIC',
      state: 'REVIEW',
      openedAt: '2026-08-05T13:00:00.000Z',
      finalizedAt: null,
      status: 'PUNTUAL',
      statusSource: 'BIOMETRIC',
      biometricMarkedAt: '2026-08-05T13:02:03.000Z',
      provisional: true,
      definitive: false,
    };
    await page.goto(`${APP_URL}/#/control-asistencia/registro`);
    await page.clock.fastForward(1);
    await expect(page.getByText('Puntual', { exact: true })).toBeVisible();
    await expect(page.getByText('Huella validada')).toBeVisible();
    await expect(page.getByText('En revisión')).toBeVisible();
    await expect(
      page.locator('.attendance-header').getByText('MARCACIÓN')
    ).toBeVisible();
    await expect(
      page.locator('.attendance-header').getByText('MARCACIÓN')
    ).toHaveCSS('justify-content', 'center');

    const ana = page
      .locator('.attendanceList-container')
      .filter({ hasText: 'Ana Prueba' });
    const bruno = page
      .locator('.attendanceList-container')
      .filter({ hasText: 'Bruno Prueba' });
    await expect(ana.locator('.attendanceList-marking--desktop')).toHaveText(
      '08:02:03'
    );
    await expect(bruno.locator('.attendanceList-marking--desktop')).toHaveText(
      'Sin huella'
    );
    await page.setViewportSize({ width: 700, height: 800 });
    await expect(ana.locator('.attendanceList-marking--mobile')).toBeVisible();
    await expect(ana.locator('.attendanceList-marking--desktop')).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 720 });
    await ana.locator('input[value="TARDE"]').click();
    const dialog = page.getByRole('dialog', {
      name: 'Justificar corrección de huella',
    });
    await dialog
      .getByLabel('Motivo de la corrección')
      .fill('Marcación duplicada');
    await dialog.getByRole('button', { name: 'Aplicar corrección' }).click();
    await page.clock.fastForward(1_000);
    await expect.poll(() => state.batchBodies.length).toBe(1);
    await expect(ana.locator('.attendanceList-marking--desktop')).toHaveText(
      '08:02:03'
    );
    expect(state.batchBodies[0].changes).toEqual([
      { userId: 10, status: 'TARDE', reason: 'Marcación duplicada' },
    ]);

    state.currentAttendance = {
      ...state.currentAttendance,
      state: 'FINALIZED',
      status: 'TARDE',
      statusSource: 'MANUAL_CORRECTION',
      provisional: false,
      definitive: true,
      finalizedAt: '2026-08-05T14:00:00.000Z',
    };
    await page.reload();
    await page.clock.fastForward(1);
    await expect(page.getByText('Definitivo')).toBeVisible();
    await page
      .getByRole('button', { name: 'Cerrar resultado de asistencia' })
      .click();
    await page.reload();
    await page.clock.fastForward(1);
    await expect(page.getByText('Definitivo')).toHaveCount(0);

    state.currentAttendance = {
      ...state.currentAttendance,
      listId: 42,
      title: 'Segundo llamado',
    };
    await page.reload();
    await page.clock.fastForward(1);
    await expect(page.getByText('Segundo llamado')).toBeVisible();
  });
});
