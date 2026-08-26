import { expect, test, type Page, type Route } from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';

const users = [
  {
    id: 10,
    name: 'Gerente A',
    email: 'gerente-a@test.local',
    status: true,
    role: { id: 7, name: 'Gerentes' },
  },
  {
    id: 20,
    name: 'Gerente B',
    email: 'gerente-b@test.local',
    status: true,
    role: { id: 7, name: 'Gerentes' },
  },
  {
    id: 30,
    name: 'Gerente C',
    email: 'gerente-c@test.local',
    status: true,
    role: { id: 7, name: 'Gerentes' },
  },
];

const participant = (userId: number, position: number) => {
  const user = users.find(item => item.id === userId)!;
  return {
    id: `participant-${userId}`,
    dutyId: '11111111-1111-4111-8111-111111111111',
    userId,
    position,
    user: {
      id: user.id,
      email: user.email,
      status: true,
      role: user.role,
      roleId: user.role.id,
      profile: { firstName: user.name, lastName: '' },
    },
  };
};

const weeklyDuty = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Llamar lista',
  description: 'Responsable semanal',
  capabilityKey: null,
  accessWindowDays: 14,
  frequency: 'WEEKLY',
  assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
  participantSource: 'EXPLICIT',
  evidencePolicy: 'NONE',
  rosterVersion: 1,
  weekStartsOn: 'MONDAY',
  recurrenceRule: {
    frequency: 'WEEKLY',
    weekStartsOn: 'MONDAY',
    weekdays: ['MONDAY', 'TUESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    slots: [{ key: 'semana-operativa-1', label: 'Semana operativa' }],
  },
  validFrom: '2026-08-03T00:00:00.000Z',
  validUntil: null,
  planningStartsOn: '2026-08-03T00:00:00.000Z',
  excludedOccurrenceKeys: [],
  configurationVersion: 1,
  isActive: true,
  lastReconciledAt: null,
  participants: [participant(10, 0), participant(20, 1), participant(30, 2)],
  createdAt: '2026-07-15T12:00:00.000Z',
  updatedAt: '2026-07-15T12:00:00.000Z',
  _count: { assignments: 3 },
  configurationStatus: 'VALID',
  configurationIssues: [],
  allowedActions: {
    inspect: true,
    edit: true,
    repair: true,
    deactivate: true,
    reactivate: false,
  },
};

const assignmentDuty = {
  id: weeklyDuty.id,
  name: weeklyDuty.name,
  capabilityKey: weeklyDuty.capabilityKey,
  participants: weeklyDuty.participants,
};

const weeklyAssignment = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  dutyId: weeklyDuty.id,
  duty: assignmentDuty,
  occurrenceKey: '2026-08-03',
  periodStart: '2026-08-03',
  periodEnd: '2026-08-08',
  dueOn: '2026-08-08',
  slotKey: 'period',
  slotLabel: 'Semana operativa',
  slotInstructions: null,
  baseSlotKey: null,
  slotPosition: null,
  assignedUserId: 10,
  assignedUser: participant(10, 0).user,
  executedByUserId: null,
  executedByUser: null,
  status: 'PENDING',
  configurationVersion: 1,
  rosterVersion: 1,
  evidencePolicy: 'NONE',
  origin: 'AUTO',
  isLocked: true,
  resolutionNotes: null,
  coverageStart: '2026-08-03',
  coverageEnd: '2026-08-08',
  coverageLabel: '2026-08-03 - 2026-08-08 - Semana operativa',
  createdAt: '2026-07-15T12:00:00.000Z',
  updatedAt: '2026-07-15T12:00:00.000Z',
  swapRequests: [],
  evidences: [],
};

const directedSwapRequest = (
  id: string,
  requesterUserId = 10,
  targetUserId = 20
) => ({
  id,
  assignmentId: weeklyAssignment.id,
  requesterUserId,
  requesterUser: participant(requesterUserId, 0).user,
  targetUserId,
  targetUser: participant(targetUserId, 1).user,
  status: 'PENDING',
  reason: 'Cobertura coordinada con el siguiente responsable',
  createdAt: '2026-07-16T12:00:00.000Z',
  updatedAt: '2026-07-16T12:00:00.000Z',
  assignment: weeklyAssignment,
});

const profile = {
  id: 99,
  email: 'admin@test.local',
  isSystemUser: true,
  profile: { firstName: 'Admin', lastName: 'Rotaciones' },
  role: {
    id: 1,
    name: 'Administrador',
    menuPoints: [
      {
        id: 1,
        name: 'Rotaciones',
        route: 'rotaciones',
        typeRol: 'MOD',
        menu: [
          {
            id: 2,
            name: 'Configuracion',
            route: 'configuracion',
            typeRol: 'MOD',
          },
        ],
      },
    ],
  },
  offices: [],
  userType: 'PRESENCIAL',
};

const personalProfile = {
  ...profile,
  id: 10,
  email: 'gerente-a@test.local',
  isSystemUser: false,
  profile: { firstName: 'Gerente', lastName: 'A' },
  role: {
    id: 7,
    name: 'Gerentes',
    menuPoints: [
      {
        id: 1,
        name: 'Rotaciones',
        route: 'rotaciones',
        typeRol: 'MOD',
        menu: [
          {
            id: 1,
            name: 'Mis turnos',
            route: 'mis-turnos',
            typeRol: 'MOD',
          },
        ],
      },
    ],
  },
};

const previewFromDraft = (draft: {
  participantIds: number[];
  validFrom: string;
  assignmentStrategy?: string;
  recurrence: {
    frequency: string;
    slots: Array<{
      key: string;
      label: string;
      instructions?: string | null;
      capacity?: { mode: 'FIXED'; count: number } | { mode: 'REMAINDER' };
    }>;
  };
}) => {
  const addDays = (value: string, days: number) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const occurrenceKeys = [0, 7, 14].map(days => addDays(draft.validFrom, days));
  const periodEnds = occurrenceKeys.map(key =>
    draft.recurrence.frequency === 'WEEKLY' ? addDays(key, 6) : key
  );
  const assignedUser = (userId: number) => {
    const user = users.find(item => item.id === userId)!;
    return {
      id: user.id,
      email: user.email,
      profile: { firstName: user.name, lastName: '' },
      role: user.role,
    };
  };
  const regularOccurrences = occurrenceKeys.map((occurrenceKey, index) => {
    const user = users.find(
      item =>
        item.id === draft.participantIds[index % draft.participantIds.length]
    )!;
    return {
      occurrenceKey,
      periodStart: occurrenceKey,
      periodEnd: periodEnds[index],
      dueOn: periodEnds[index],
      slotKey: 'period',
      slotLabel: draft.recurrence.slots[0]?.label || 'Semana operativa',
      slotInstructions: draft.recurrence.slots[0]?.instructions ?? null,
      baseSlotKey: null,
      slotPosition: null,
      assignedUser: assignedUser(user.id),
    };
  });
  const fixedCapacity = draft.recurrence.slots.reduce(
    (total, slot) =>
      total + (slot.capacity?.mode === 'FIXED' ? slot.capacity.count : 0),
    0
  );
  const distributedOccurrences = occurrenceKeys.flatMap(
    (occurrenceKey, occurrenceIndex) => {
      const rotatedParticipantIds = draft.participantIds.map(
        (_, participantIndex) =>
          draft.participantIds[
            (participantIndex + occurrenceIndex) % draft.participantIds.length
          ]
      );
      let participantCursor = 0;
      return draft.recurrence.slots.flatMap(slot => {
        const assignmentCount =
          slot.capacity?.mode === 'FIXED'
            ? slot.capacity.count
            : draft.participantIds.length - fixedCapacity;
        return Array.from({ length: assignmentCount }, (_, slotIndex) => {
          const userId = rotatedParticipantIds[participantCursor++];
          return {
            occurrenceKey,
            periodStart: occurrenceKey,
            periodEnd: periodEnds[occurrenceIndex],
            dueOn: periodEnds[occurrenceIndex],
            slotKey: `${slot.key}:${String(slotIndex + 1).padStart(3, '0')}`,
            slotLabel: slot.label,
            slotInstructions: slot.instructions ?? null,
            baseSlotKey: slot.key,
            slotPosition: slotIndex + 1,
            assignedUser: assignedUser(userId),
          };
        });
      });
    }
  );
  return {
    occurrences:
      draft.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
        ? distributedOccurrences
        : regularOccurrences,
    warnings: [],
    distributionWarnings:
      draft.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
        ? [
            {
              occurrenceKey: occurrenceKeys[1],
              periodStart: occurrenceKeys[1],
              periodEnd: periodEnds[1],
              repeatedParticipantCount: 2,
            },
            {
              occurrenceKey: occurrenceKeys[2],
              periodStart: occurrenceKeys[2],
              periodEnd: periodEnds[2],
              repeatedParticipantCount: 1,
            },
          ]
        : [],
    adjustedStart: occurrenceKeys[0],
    horizonEnd: '2028-08-02',
    rosterFingerprint: 'a'.repeat(64),
    participantSnapshot: draft.participantIds.map(userId => {
      const user = users.find(item => item.id === userId)!;
      return {
        id: user.id,
        email: user.email,
        status: true,
        profile: { firstName: user.name, lastName: '' },
        role: user.role,
      };
    }),
  };
};

const reconciliationResult = {
  dutyId: weeklyDuty.id,
  createdCount: 3,
  preservedCount: 0,
  deletedCount: 0,
  conflictCount: 0,
  createdIds: [],
  deletedIds: [],
  conflicts: [],
};

type ApiState = {
  duties: unknown[];
  assignments: unknown[];
  pendingDirectedSwaps: ReturnType<typeof directedSwapRequest>[];
  swapActions: Array<{ id: string; action: 'approve' | 'reject' }>;
  createBodies: unknown[];
  updateBodies: unknown[];
  statusBodies: unknown[];
  repairCount: number;
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const mockApi = async (
  page: Page,
  initialDuties: unknown[],
  initialPendingDirectedSwaps: ReturnType<typeof directedSwapRequest>[] = [],
  initialAssignments: unknown[] = []
) => {
  const state: ApiState = {
    duties: [...initialDuties],
    assignments: [...initialAssignments],
    pendingDirectedSwaps: [...initialPendingDirectedSwaps],
    swapActions: [],
    createBodies: [],
    updateBodies: [],
    statusBodies: [],
    repairCount: 0,
  };
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postDataJSON?.() as Record<string, unknown> | null;

    if (path.endsWith('/profile')) return json(route, profile);
    if (path.endsWith('/duty-rotations/users')) return json(route, users);
    if (path.endsWith('/role/form')) {
      return json(route, [{ id: 7, name: 'Gerentes' }]);
    }
    if (path.endsWith('/duty-rotations/duties') && method === 'GET') {
      return json(route, state.duties);
    }
    if (path.endsWith('/duty-rotations/assignments') && method === 'GET') {
      return json(route, state.assignments);
    }
    if (
      path.endsWith('/duty-rotations/swap-requests/pending-directed') &&
      method === 'GET'
    ) {
      return json(route, state.pendingDirectedSwaps);
    }
    const directedSwapAction = path.match(
      /\/duty-rotations\/swap-requests\/([^/]+)\/(approve|reject)$/
    );
    if (directedSwapAction && method === 'PATCH') {
      const [, id, action] = directedSwapAction;
      const request = state.pendingDirectedSwaps.find(item => item.id === id);
      state.pendingDirectedSwaps = state.pendingDirectedSwaps.filter(
        item => item.id !== id
      );
      state.swapActions.push({
        id,
        action: action as 'approve' | 'reject',
      });
      if (action === 'approve') {
        return json(route, {
          ...weeklyAssignment,
          assignedUserId: request?.targetUserId ?? 20,
          assignedUser: request?.targetUser ?? participant(20, 1).user,
          origin: 'SWAP',
        });
      }
      return json(route, { ...request, status: 'REJECTED' });
    }
    if (path.endsWith('/duties/preview') && method === 'POST') {
      return json(route, previewFromDraft(body as never));
    }
    if (path.endsWith('/edit-preview') && method === 'POST') {
      const preview = previewFromDraft((body?.draft ?? {}) as never);
      return json(route, {
        preservedCount: 1,
        removedCount: 2,
        regeneratedCount: 3,
        conflictCount: 1,
        preserved: [],
        removed: [],
        conflicts: [],
        preview,
      });
    }
    if (path.endsWith('/status-preview') && method === 'POST') {
      return json(route, {
        isActive: false,
        removableCount: 2,
        preservedCount: 1,
        conflictCount: 1,
        conflicts: [],
      });
    }
    if (path.endsWith('/duty-rotations/duties') && method === 'POST') {
      state.createBodies.push(body);
      const draft = body?.draft as
        | { validFrom?: string; recurrence?: Record<string, unknown> }
        | undefined;
      const date = new Date(`${draft?.validFrom}T00:00:00.000Z`);
      const weekStartsOn = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ][date.getUTCDay()];
      const createdDuty = {
        ...weeklyDuty,
        validFrom: draft?.validFrom ?? weeklyDuty.validFrom,
        weekStartsOn,
        recurrenceRule: {
          ...(draft?.recurrence ?? weeklyDuty.recurrenceRule),
          weekStartsOn,
        },
      };
      state.duties = [createdDuty];
      return json(
        route,
        {
          duty: createdDuty,
          reconciliation: reconciliationResult,
          idempotentReplay: false,
        },
        201
      );
    }
    if (/\/duties\/[^/]+$/.test(path) && method === 'PATCH') {
      state.updateBodies.push(body);
      return json(route, {
        duty: { ...weeklyDuty, configurationVersion: 2 },
        reconciliation: reconciliationResult,
        idempotentReplay: false,
      });
    }
    if (path.endsWith('/status') && method === 'PATCH') {
      state.statusBodies.push(body);
      state.duties = [{ ...weeklyDuty, isActive: false }];
      return json(route, {
        duty: state.duties[0],
        reconciliation: null,
        idempotentReplay: false,
      });
    }
    if (path.endsWith('/reconcile') && method === 'POST') {
      state.repairCount += 1;
      return json(route, {
        dutyId: weeklyDuty.id,
        createdCount: 1,
        preservedCount: 2,
        deletedCount: 0,
        conflictCount: 1,
        createdIds: [],
        deletedIds: [],
        conflicts: [],
      });
    }
    return json(route, []);
  });
  return state;
};

const openConfiguration = async (page: Page) => {
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.goto(`${APP_URL}/#/rotaciones/configuracion`);
  await expect(
    page.getByRole('heading', { name: 'Planificación de rotaciones' })
  ).toBeVisible();
};

test.describe('planificacion de rotaciones', () => {
  test('crea una responsabilidad semanal y respeta el orden visible', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: undefined,
      });
    });
    const state = await mockApi(page, []);
    await openConfiguration(page);
    await expect(
      page.getByText('No hay actividades configuradas')
    ).toBeVisible();
    await page.getByRole('button', { name: /Nueva actividad/ }).click();
    await expect(
      page.getByRole('navigation', { name: 'Pasos de la actividad' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Define la actividad' })
    ).toBeVisible();
    await page.getByText('Permisos y acceso posterior').click();
    await expect(page.getByLabel('Permiso personalizado')).toHaveCount(0);
    await expect(
      page.getByLabel('Días de consulta después del cierre')
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: /Conciliación de asistencia/ })
      .click();
    await expect(
      page.getByLabel('Días de consulta después del cierre')
    ).toBeVisible();
    await page.getByRole('button', { name: /Sin permiso especial/ }).click();
    await expect(
      page.getByLabel('Días de consulta después del cierre')
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByText('Escribe un nombre para la actividad.')
    ).toBeVisible();
    await page.getByLabel('Nombre de la actividad').fill('Llamar lista');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByText('La semana comienza el')).toHaveCount(0);
    await expect(page.getByLabel('Inicio de la rotación')).toBeVisible();
    await page.getByRole('button', { name: /Mensual/ }).click();
    await expect(page.getByLabel('Inicio de vigencia')).toBeVisible();
    await expect(page.getByLabel('Días del mes')).toBeVisible();
    await page.getByRole('button', { name: /Semanal/ }).click();
    await page.getByLabel('Inicio de la rotación').fill('2026-07-17');
    await expect(
      page.getByRole('heading', { name: 'Responsabilidad del periodo' })
    ).toHaveCount(0);
    await expect(page.locator('#duty-slot-0')).toHaveCount(0);
    await expect(page.getByText('Una asignación por periodo')).toBeVisible();
    await page
      .getByRole('button', { name: /Un responsable por tarea/ })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Tareas independientes' })
    ).toBeVisible();
    await expect(page.locator('#duty-slot-0')).toBeVisible();
    await page
      .getByRole('button', { name: /Un responsable por periodo/ })
      .click();
    await expect(page.locator('#duty-slot-0')).toHaveCount(0);
    await expect(
      page.getByText(/primer ciclo comienza el viernes/i)
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: /Gerente A/ }).click();
    await page.getByRole('button', { name: /Gerente B/ }).click();
    await page.getByRole('button', { name: /Gerente C/ }).click();

    const gerenteB = page
      .locator('.dutyRotations-participantOrderRow')
      .filter({ hasText: 'Gerente B' });
    await gerenteB.getByRole('button', { name: 'Subir a Gerente B' }).click();

    await expect(
      page.getByText(/Periodo completo.*Gerente B/i).first()
    ).toBeVisible();
    await expect(page.getByText(/17 jul.*23 jul/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Revisa antes de crear' })
    ).toBeVisible();
    await expect(
      page.getByText('Gerente B', { exact: true }).last()
    ).toBeVisible();
    await expect(page.getByText(/continuará sin fecha final/i)).toBeVisible();
    const createButton = page.getByRole('button', {
      name: 'Crear actividad y turnos',
    });
    await expect(createButton).toBeEnabled();
    expect(state.createBodies).toHaveLength(0);
    await createButton.press('Enter');
    await expect(
      page.getByRole('dialog', { name: 'Nueva actividad de rotación' })
    ).toBeHidden();

    await expect(page.getByText('Llamar lista', { exact: true })).toBeVisible();
    await expect(page.getByText(/desde vie, 17 jul/i)).toBeVisible();
    expect(state.createBodies).toHaveLength(1);
    const payload = state.createBodies[0] as {
      requestKey: string;
      draft: {
        capabilityKey: string | null;
        accessWindowDays: number;
        assignmentStrategy: string;
        recurrence: {
          frequency: string;
          weekdays: string[];
          slots: Array<{ key: string; label: string }>;
        };
        participantIds: number[];
      };
    };
    expect(payload.requestKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(payload.draft.capabilityKey).toBeNull();
    expect(payload.draft.accessWindowDays).toBe(14);
    expect(payload.draft.assignmentStrategy).toBe('ONE_OWNER_PER_PERIOD');
    expect(payload.draft.recurrence.frequency).toBe('WEEKLY');
    expect(payload.draft.recurrence).not.toHaveProperty('weekStartsOn');
    expect(payload.draft.recurrence.slots).toEqual([
      { key: 'period', label: 'Periodo completo' },
    ]);
    expect(payload.draft.recurrence.weekdays).toEqual([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ]);
    expect(payload.draft.participantIds).toEqual([20, 10, 30]);
  });

  test('configura una jornada que distribuye a todo el personal entre grupos', async ({
    page,
  }) => {
    const state = await mockApi(page, []);
    await openConfiguration(page);
    await page.getByRole('button', { name: /Nueva actividad/ }).click();
    await page
      .getByLabel('Nombre de la actividad')
      .fill('Limpieza general del edificio');
    await page
      .getByRole('button', { name: /Fotografías obligatorias/ })
      .click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page
      .getByRole('button', { name: /Distribuir a todo el equipo/ })
      .click();
    await page.locator('#duty-slot-0').fill('Interior');
    await page
      .locator('#duty-slot-instructions-0')
      .fill('Limpiar oficinas, escaleras y ventanas.');
    await page.getByRole('button', { name: 'Agregar grupo' }).click();
    await page.locator('#duty-slot-1').fill('Exterior');
    await expect(page.getByLabel('Cantidad para Exterior')).toHaveValue('1');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page
      .getByRole('button', { name: /Todo el personal activo presencial/ })
      .click();
    await expect(page.getByText(/3 personas incluidas/i)).toBeVisible();
    await expect(page.getByText('Personal restante').last()).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText(/Interior|Exterior/).last()).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Próximas jornadas y distribución',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: /Distribución de/i })
    ).toHaveCount(1);
    const firstDistribution = page
      .getByRole('table', { name: /Distribución de/i })
      .first();
    await expect(firstDistribution).toContainText('Interior');
    await expect(firstDistribution).toContainText('Exterior');
    await expect(firstDistribution).toContainText('Gerente A');
    await expect(firstDistribution).toContainText('Gerente B');
    await expect(firstDistribution).toContainText('Gerente C');
    await expect(
      page.getByText(
        '2 de las próximas 3 jornadas tienen personas que repiten zona.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Repeticiones de zona por jornada' })
    ).toContainText('2 personas repiten zona');
    await expect(
      page.getByText('Revisa esta condición', { exact: true })
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Expandir todas' }).click();
    await expect(
      page.getByRole('table', { name: /Distribución de/i })
    ).toHaveCount(3);
    await page.getByRole('button', { name: 'Contraer todas' }).click();
    await expect(
      page.getByRole('table', { name: /Distribución de/i })
    ).toHaveCount(0);

    const createButton = page.getByRole('button', {
      name: 'Crear actividad y turnos',
    });
    await expect(createButton).toBeEnabled();
    await createButton.press('Enter');
    expect(state.createBodies).toHaveLength(1);
    const payload = state.createBodies[0] as {
      draft: {
        assignmentStrategy: string;
        participantSource: string;
        evidencePolicy: string;
        participantIds: number[];
        recurrence: {
          slots: Array<{
            label: string;
            instructions?: string;
            capacity: { mode: string; count?: number };
          }>;
        };
      };
    };
    expect(payload.draft.assignmentStrategy).toBe('DISTRIBUTE_PARTICIPANTS');
    expect(payload.draft.participantSource).toBe('ACTIVE_ELIGIBLE_SYNC');
    expect(payload.draft.evidencePolicy).toBe('REQUIRED_PHOTO');
    expect(payload.draft.participantIds).toEqual([10, 20, 30]);
    expect(payload.draft.recurrence.slots).toEqual([
      expect.objectContaining({
        label: 'Interior',
        instructions: 'Limpiar oficinas, escaleras y ventanas.',
        capacity: { mode: 'REMAINDER' },
      }),
      expect.objectContaining({
        label: 'Exterior',
        capacity: { mode: 'FIXED', count: 1 },
      }),
    ]);
  });

  test('aísla configuraciones incompletas sin derribar la página', async ({
    page,
  }) => {
    const weeklyWithUnknownField = {
      ...weeklyDuty,
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Semanal con campo no soportado',
      recurrenceRule: {
        ...weeklyDuty.recurrenceRule,
        unsupportedField: true,
      },
    };
    const monthlyWithoutDays = {
      ...weeklyDuty,
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Mensual incompleta',
      frequency: 'MONTHLY',
      recurrenceRule: {
        frequency: 'MONTHLY',
        slots: [{ key: 'cierre', label: 'Cierre' }],
      },
    };
    const weeklyWithoutSlots = {
      ...weeklyDuty,
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Semanal sin bloques',
      recurrenceRule: {
        frequency: 'WEEKLY',
        weekdays: ['MONDAY', 'SATURDAY'],
      },
    };
    const nullParticipantUser = {
      ...weeklyDuty,
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Participante sin perfil',
      participants: [{ ...participant(10, 0), user: null }],
    };
    const nullProfile = {
      ...weeklyDuty,
      id: '77777777-7777-4777-8777-777777777777',
      name: 'Participante sin perfil personal',
      participants: [
        {
          ...participant(10, 0),
          user: { ...participant(10, 0).user, profile: null },
        },
      ],
    };

    await mockApi(page, [
      weeklyWithUnknownField,
      monthlyWithoutDays,
      weeklyWithoutSlots,
      {
        ...weeklyDuty,
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Sin participantes',
        participants: [],
      },
      nullParticipantUser,
      nullProfile,
    ]);
    await openConfiguration(page);

    await expect(
      page.getByText('Semanal con campo no soportado')
    ).toBeVisible();
    await expect(page.getByText('Mensual incompleta')).toBeVisible();
    await expect(page.getByText('Semanal sin bloques')).toBeVisible();
    await expect(
      page.getByText('Sin participantes', { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText('Participante sin perfil', { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText('Participante sin perfil personal')
    ).toBeVisible();
    await expect(page.getByText('Configuración incompatible')).toHaveCount(5);
    const invalidActivity = page
      .locator('.dutyRotations-activityRow')
      .filter({ hasText: 'Semanal con campo no soportado' });
    await invalidActivity
      .getByRole('button', { name: /Ver planificación/ })
      .click();
    const invalidPanel = page.getByRole('dialog', {
      name: 'Semanal con campo no soportado',
    });
    await expect(
      invalidPanel.getByText('Configuración incompatible')
    ).toBeVisible();
    await expect(
      invalidPanel.getByRole('button', { name: 'Editar' })
    ).toHaveCount(0);
    await expect(
      invalidPanel.getByRole('button', { name: 'Reparar' })
    ).toHaveCount(0);
    await expect(
      invalidPanel.getByRole('button', { name: 'Compartir planificación' })
    ).toHaveCount(0);
  });

  test('agrupa una jornada distribuida y abre el flujo de comunicación', async ({
    page,
  }) => {
    const distributedDuty = {
      ...weeklyDuty,
      name: 'Limpieza general del edificio',
      assignmentStrategy: 'DISTRIBUTE_PARTICIPANTS',
      participantSource: 'ACTIVE_ELIGIBLE_SYNC',
      recurrenceRule: {
        ...weeklyDuty.recurrenceRule,
        slots: [
          {
            key: 'interior',
            label: 'Interior',
            instructions: 'Limpiar oficinas y escaleras.',
            capacity: { mode: 'FIXED', count: 2 },
          },
          {
            key: 'exterior',
            label: 'Exterior',
            instructions: 'Barrer el ingreso principal.',
            capacity: { mode: 'REMAINDER' },
          },
        ],
      },
    };
    const distributedAssignments = [
      {
        ...weeklyAssignment,
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        duty: { ...assignmentDuty, name: distributedDuty.name },
        slotKey: 'interior:001',
        slotLabel: 'Interior',
        slotInstructions: 'Limpiar oficinas y escaleras.',
        baseSlotKey: 'interior',
        slotPosition: 1,
      },
      {
        ...weeklyAssignment,
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
        duty: { ...assignmentDuty, name: distributedDuty.name },
        slotKey: 'interior:002',
        slotLabel: 'Interior',
        slotInstructions: 'Limpiar oficinas y escaleras.',
        baseSlotKey: 'interior',
        slotPosition: 2,
        assignedUserId: 20,
        assignedUser: participant(20, 1).user,
      },
      {
        ...weeklyAssignment,
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
        duty: { ...assignmentDuty, name: distributedDuty.name },
        slotKey: 'exterior:001',
        slotLabel: 'Exterior',
        slotInstructions: 'Barrer el ingreso principal.',
        baseSlotKey: 'exterior',
        slotPosition: 1,
        assignedUserId: 30,
        assignedUser: participant(30, 2).user,
      },
    ];
    await mockApi(page, [distributedDuty], [], distributedAssignments);
    await openConfiguration(page);

    const activity = page
      .locator('.dutyRotations-activityRow')
      .filter({ hasText: distributedDuty.name });
    await expect(activity).toContainText('3 participantes');
    await expect(activity).not.toContainText('Gerente A →');
    await activity.getByRole('button', { name: /Ver planificación/ }).click();

    const panel = page.getByRole('dialog', { name: distributedDuty.name });
    await expect(panel).toContainText('Interior');
    await expect(panel).toContainText('Limpiar oficinas y escaleras.');
    await expect(panel).toContainText('Gerente A');
    await expect(panel).toContainText('Gerente B');
    await expect(panel).toContainText('Exterior');
    await panel
      .getByRole('button', { name: 'Compartir planificación' })
      .click();

    const shareDialog = page.getByRole('dialog', {
      name: 'Compartir planificación',
    });
    await expect(
      shareDialog.getByRole('button', { name: /Próxima jornada/ })
    ).toBeVisible();
    await expect(
      shareDialog.getByRole('button', { name: /Elegir jornadas/ })
    ).toBeVisible();
    await expect(
      shareDialog.getByRole('button', { name: /Próximas rotaciones/ })
    ).toHaveCount(0);
  });

  test('muestra un error controlado cuando la lista no es un arreglo', async ({
    page,
  }) => {
    await mockApi(page, []);
    await page.route('**/api/v1/duty-rotations/duties**', route =>
      json(route, { data: [] })
    );
    await openConfiguration(page);

    await expect(
      page.getByText('No se pudieron interpretar las actividades')
    ).toBeVisible();
    await expect(page.getByText(/forma inesperada/)).toBeVisible();
  });

  test('previsualiza edición, desactivación y reparación por actividad', async ({
    page,
  }) => {
    const state = await mockApi(page, [weeklyDuty]);
    await openConfiguration(page);

    await page.getByRole('button', { name: /Ver planificación/ }).click();
    const planningPanel = page.getByRole('dialog', { name: weeklyDuty.name });
    await planningPanel.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByText('La semana comienza el')).toHaveCount(0);
    await page.getByRole('button', { name: 'Editar programación' }).click();
    await page.getByLabel('Inicio de la rotación').fill('2026-08-07');
    await page.getByRole('button', { name: /Revisar cambios/ }).click();
    await expect(page.getByText(/7 ago.*13 ago/i).first()).toBeVisible();
    await expect(page.getByText('1 conservados')).toBeVisible();
    await expect(page.getByText('2 reemplazables')).toBeVisible();
    await expect(page.getByText('1 conflictos protegidos')).toBeVisible();
    await page
      .getByRole('button', { name: 'Confirmar cambios futuros' })
      .click();
    expect(state.updateBodies).toHaveLength(1);
    const updatePayload = state.updateBodies[0] as {
      draft: { validFrom: string; recurrence: Record<string, unknown> };
    };
    expect(updatePayload.draft.validFrom).toBe('2026-08-07');
    expect(updatePayload.draft.recurrence).not.toHaveProperty('weekStartsOn');

    await planningPanel
      .getByRole('button', { name: 'Desactivar', exact: true })
      .click();
    await expect(page.getByText('2 eliminables')).toBeVisible();
    await page
      .getByRole('button', { name: 'Desactivar actividad' })
      .last()
      .click();
    expect(state.statusBodies).toHaveLength(1);

    await planningPanel
      .getByRole('button', { name: 'Reparar', exact: true })
      .click();
    await expect(page.getByText(/mismo reconciliador/)).toBeVisible();
    await page.getByRole('button', { name: 'Reparar proximos turnos' }).click();
    expect(state.repairCount).toBe(1);
  });

  test('conserva un permiso anterior no administrable sin permitir texto libre', async ({
    page,
  }) => {
    const dutyWithExistingCapability = {
      ...weeklyDuty,
      name: 'Actividad con permiso anterior',
      capabilityKey: 'existing.custom-capability',
    };
    const state = await mockApi(page, [dutyWithExistingCapability]);
    await openConfiguration(page);

    await page.getByRole('button', { name: /Ver planificación/ }).click();
    await page
      .getByRole('dialog', { name: dutyWithExistingCapability.name })
      .getByRole('button', { name: 'Editar' })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Editar Actividad con permiso anterior',
    });
    await dialog.getByRole('button', { name: 'Editar', exact: true }).click();

    await expect(dialog.getByLabel('Permiso personalizado')).toHaveCount(0);
    await expect(
      dialog.getByText('Permiso existente no disponible')
    ).toBeVisible();
    await expect(
      dialog.getByLabel('Días de consulta después del cierre')
    ).toBeVisible();

    await dialog.getByRole('button', { name: /Revisar cambios/ }).click();
    await expect(
      dialog.getByText(/Permiso anterior no administrable.*14 días/i)
    ).toBeVisible();
    await dialog
      .getByRole('button', { name: 'Confirmar cambios futuros' })
      .click();

    expect(state.updateBodies).toHaveLength(1);
    const updatePayload = state.updateBodies[0] as {
      draft: { capabilityKey: string | null };
    };
    expect(updatePayload.draft.capabilityKey).toBe(
      'existing.custom-capability'
    );
  });

  test('aprueba y rechaza cambios dirigidos desde configuración', async ({
    page,
  }) => {
    const firstRequest = directedSwapRequest(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    const secondRequest = directedSwapRequest(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      20,
      30
    );
    const state = await mockApi(
      page,
      [weeklyDuty],
      [firstRequest, secondRequest]
    );
    await openConfiguration(page);

    await page.getByRole('tab', { name: /Cambios pendientes/ }).click();

    await expect(
      page.getByText('Cobertura coordinada con el siguiente responsable')
    ).toHaveCount(2);

    await page.getByRole('button', { name: 'Aprobar' }).first().click();
    await expect
      .poll(() => state.swapActions)
      .toContainEqual({ id: firstRequest.id, action: 'approve' });

    await expect(page.getByRole('button', { name: 'Rechazar' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Rechazar' }).click();
    await expect
      .poll(() => state.swapActions)
      .toContainEqual({ id: secondRequest.id, action: 'reject' });
    await expect(
      page.getByText('No hay cambios dirigidos pendientes')
    ).toBeVisible();
  });
});

const personalAssignment = (overrides: Record<string, unknown> = {}) => ({
  ...weeklyAssignment,
  occurrenceKey: '2026-07-14',
  periodStart: '2026-07-14',
  periodEnd: '2026-07-20',
  dueOn: '2026-07-20',
  coverageStart: '2026-07-14',
  coverageEnd: '2026-07-20',
  coverageLabel: '2026-07-14 - 2026-07-20 - Semana operativa',
  swapRequests: [],
  ...overrides,
});

type PersonalApiState = {
  assignments: unknown[];
  completeBodies: Array<Record<string, unknown>>;
  swapBodies: Array<Record<string, unknown>>;
  usersLookupCalls: number;
};

const mockPersonalApi = async (page: Page, initialAssignments: unknown[]) => {
  const state: PersonalApiState = {
    assignments: [...initialAssignments],
    completeBodies: [],
    swapBodies: [],
    usersLookupCalls: 0,
  };

  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.endsWith('/profile')) return json(route, personalProfile);
    if (path.endsWith('/duty-rotations/users')) {
      state.usersLookupCalls += 1;
      return json(route, { message: 'Forbidden' }, 403);
    }
    if (
      path.endsWith('/duty-rotations/assignments/my-upcoming') &&
      method === 'GET'
    ) {
      return json(route, state.assignments);
    }
    if (path.endsWith('/duty-rotations/entitlements/my') && method === 'GET') {
      return json(route, []);
    }
    if (path.endsWith('/duty-rotations/open-pool') && method === 'GET') {
      return json(route, []);
    }

    const completeMatch = path.match(
      /\/duty-rotations\/assignments\/([^/]+)\/complete$/
    );
    if (completeMatch && method === 'PATCH') {
      const postData = request.postData() ?? '';
      const readField = (name: string) =>
        new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r\\n]*)`).exec(
          postData
        )?.[1];
      const body: Record<string, unknown> = {
        executedByUserId: readField('executedByUserId'),
        resolutionNotes: readField('resolutionNotes'),
        requestKey: readField('requestKey'),
        evidenceAttached: postData.includes('name="evidence"; filename='),
      };
      const assignmentId = completeMatch[1];
      const executedByUserId = Number(body.executedByUserId);
      const completedAssignment = {
        ...(state.assignments.find(item => {
          const assignment = item as Record<string, unknown>;
          return assignment.id === assignmentId;
        }) as Record<string, unknown>),
        status: 'COMPLETED',
        executedByUserId,
        executedByUser:
          users.find(user => user.id === executedByUserId) === undefined
            ? null
            : participant(executedByUserId, 0).user,
        resolutionNotes: body.resolutionNotes,
      };
      state.completeBodies.push(body);
      state.assignments = state.assignments.map(item => {
        const assignment = item as Record<string, unknown>;
        return assignment.id === assignmentId ? completedAssignment : item;
      });
      return json(route, completedAssignment);
    }

    const swapMatch = path.match(
      /\/duty-rotations\/assignments\/([^/]+)\/swap-requests$/
    );
    if (swapMatch && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const assignmentId = swapMatch[1];
      const targetUserId =
        body.targetUserId === null ? null : Number(body.targetUserId);
      const targetUser =
        targetUserId === null ? null : participant(targetUserId, 1).user;
      const swapRequest = {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        assignmentId,
        requesterUserId: 10,
        requesterUser: participant(10, 0).user,
        targetUserId,
        targetUser,
        status: 'PENDING',
        reason: body.reason || null,
        createdAt: '2026-07-18T12:00:00.000Z',
        updatedAt: '2026-07-18T12:00:00.000Z',
      };
      state.swapBodies.push(body);
      state.assignments = state.assignments.map(item => {
        const assignment = item as Record<string, unknown>;
        if (assignment.id !== assignmentId) return item;
        return {
          ...assignment,
          status: targetUserId === null ? 'OPEN_POOL' : 'PENDING',
          origin: targetUserId === null ? 'OPEN_POOL' : assignment.origin,
          swapRequests: [swapRequest],
        };
      });
      return json(route, swapRequest, 201);
    }

    return json(route, []);
  });

  return state;
};

const openMyDutyRotations = async (page: Page) => {
  await page.clock.setFixedTime(new Date('2026-07-18T12:00:00-05:00'));
  await page.goto(`${APP_URL}/#/rotaciones/mis-turnos`);
  await expect(page.getByText('1 tareas vigentes o futuras')).toBeVisible();
};

test.describe('mis turnos', () => {
  test('rechaza evidencia malformada como error de contrato controlado', async ({
    page,
  }) => {
    await mockPersonalApi(page, [
      personalAssignment({
        evidences: [
          {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            assignmentId: weeklyAssignment.id,
            originalName: 'evidencia.svg',
            mimeType: 'image/svg+xml',
            sizeBytes: 128,
            submittedById: 10,
            createdAt: '2026-07-18T12:00:00.000Z',
            contentUrl: '/api/v1/duty-rotations/evidence.svg',
          },
        ],
      }),
    ]);
    await page.clock.setFixedTime(new Date('2026-07-18T12:00:00-05:00'));
    await page.goto(`${APP_URL}/#/rotaciones/mis-turnos`);

    await expect(
      page.getByText('No se pudieron validar tus proximos turnos.')
    ).toBeVisible();
    await expect(page.getByText('1 tareas vigentes o futuras')).toHaveCount(0);
  });

  test('completa un turno vigente en un diálogo enfocado y exige observación al cambiar ejecutor', async ({
    page,
  }) => {
    const state = await mockPersonalApi(page, [personalAssignment()]);
    await openMyDutyRotations(page);
    await expect(
      page.getByText('Días comprendidos: Mar, Mié, Jue, Vie, Sáb, Dom y Lun', {
        exact: true,
      })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Completar turno' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Completar turno' })
    ).toBeVisible();
    const assignmentSummary = dialog.getByRole('region', {
      name: 'Resumen del turno',
    });
    await expect(
      assignmentSummary.getByText('Llamar lista', { exact: true })
    ).toBeVisible();
    await expect(
      assignmentSummary.getByText('Semana operativa', { exact: true })
    ).toBeVisible();
    await expect(
      assignmentSummary.getByText(
        'Días comprendidos: Mar, Mié, Jue, Vie, Sáb, Dom y Lun',
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      dialog.getByRole('combobox', { name: '¿Quién realizó el turno?' })
    ).toBeVisible();
    await expect(dialog.getByText('Enviar a la bolsa')).toHaveCount(0);
    await expect(dialog.getByText('Proponer a una persona')).toHaveCount(0);

    await dialog
      .getByRole('combobox', { name: '¿Quién realizó el turno?' })
      .click();
    await page.getByRole('option', { name: 'Gerente B' }).click();
    await expect(
      dialog.getByRole('button', { name: 'Marcar como completado' })
    ).toBeDisabled();
    await dialog
      .getByRole('textbox', { name: /Observaciones/ })
      .fill('Gerente B cubrió el turno coordinado.');
    await dialog
      .getByRole('button', { name: 'Marcar como completado' })
      .click();

    await expect.poll(() => state.completeBodies.length).toBe(1);
    expect(Number(state.completeBodies[0].executedByUserId)).toBe(20);
    expect(state.completeBodies[0].resolutionNotes).toBe(
      'Gerente B cubrió el turno coordinado.'
    );
    expect(String(state.completeBodies[0].requestKey)).toMatch(
      /^[0-9a-f-]{36}$/
    );
    expect(state.usersLookupCalls).toBe(0);
  });

  test('mantiene deshabilitado completar en un turno futuro e informa la fecha de inicio', async ({
    page,
  }) => {
    await mockPersonalApi(page, [
      personalAssignment({
        occurrenceKey: '2026-08-03',
        periodStart: '2026-08-03',
        periodEnd: '2026-08-08',
        dueOn: '2026-08-08',
      }),
    ]);
    await openMyDutyRotations(page);

    await expect(
      page.getByRole('button', { name: 'Completar turno' })
    ).toBeDisabled();
    await expect(
      page.getByText(/Podrás completar este turno desde el lun, 03 ago/i)
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Solicitar cambio' })
    ).toBeEnabled();
    await expect(
      page.getByText('Días comprendidos: Lun, Mar, Mié, Jue, Vie y Sáb', {
        exact: true,
      })
    ).toBeVisible();
  });

  test('exige y envia una fotografia cuando la actividad la requiere', async ({
    page,
  }) => {
    const state = await mockPersonalApi(page, [
      personalAssignment({ evidencePolicy: 'REQUIRED_PHOTO' }),
    ]);
    await openMyDutyRotations(page);
    await page.getByRole('button', { name: 'Completar turno' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: 'Marcar como completado' })
    ).toBeDisabled();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'limpieza.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    await expect(dialog.getByText('limpieza.png')).toBeVisible();
    await dialog
      .getByRole('button', { name: 'Marcar como completado' })
      .click();
    await expect.poll(() => state.completeBodies.length).toBe(1);
    expect(state.completeBodies[0].evidenceAttached).toBe(true);
  });

  test('envía el turno a la bolsa desde un diálogo sin opciones de completar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const state = await mockPersonalApi(page, [personalAssignment()]);
    await openMyDutyRotations(page);

    await page.getByRole('button', { name: 'Solicitar cambio' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Solicitar cambio de turno' })
    ).toBeVisible();
    await expect(
      dialog
        .getByRole('region', { name: 'Resumen del turno' })
        .getByText('Días comprendidos: Mar, Mié, Jue, Vie, Sáb, Dom y Lun', {
          exact: true,
        })
    ).toBeVisible();
    await expect(
      dialog.getByRole('radio', { name: /Enviar a la bolsa/ })
    ).toBeVisible();
    await expect(
      dialog.getByRole('radio', { name: /Proponer a una persona/ })
    ).toBeVisible();
    await expect(
      dialog.getByRole('combobox', { name: 'Participante propuesto' })
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Marcar como completado' })
    ).toHaveCount(0);

    const dialogBounds = await dialog.boundingBox();
    expect(dialogBounds?.width).toBeLessThanOrEqual(390);
    const poolRadio = dialog.getByRole('radio', { name: /Enviar a la bolsa/ });
    await poolRadio.focus();
    await expect(poolRadio).toBeFocused();
    await poolRadio.press('Space');
    await expect(poolRadio).toBeChecked();
    await dialog
      .getByRole('textbox', { name: /Motivo/ })
      .fill('No estaré disponible esta semana.');
    await dialog.getByRole('button', { name: 'Enviar solicitud' }).click();

    await expect
      .poll(() => state.swapBodies)
      .toContainEqual({
        targetUserId: null,
        reason: 'No estaré disponible esta semana.',
      });
    await expect(
      page.getByText('Esperando que otro participante tome el turno.')
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Completar turno' })
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Solicitar cambio' })
    ).toHaveCount(0);
  });

  test('propone a un participante y evita otra solicitud mientras está pendiente', async ({
    page,
  }) => {
    const state = await mockPersonalApi(page, [personalAssignment()]);
    await openMyDutyRotations(page);
    await expect(
      page.getByText('Días comprendidos: Mar, Mié, Jue, Vie, Sáb, Dom y Lun', {
        exact: true,
      })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Solicitar cambio' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('Proponer a una persona', { exact: true }).click();
    await expect(
      dialog.getByRole('radio', { name: /Proponer a una persona/ })
    ).toBeChecked();
    const targetSelect = dialog.getByRole('combobox', {
      name: 'Participante propuesto',
    });
    await expect(targetSelect).toBeVisible();
    await targetSelect.click();
    await page.getByRole('option', { name: 'Gerente B' }).click();
    await dialog
      .getByRole('textbox', { name: /Motivo/ })
      .fill('Cambio coordinado con Gerente B.');
    await dialog.getByRole('button', { name: 'Enviar solicitud' }).click();

    await expect
      .poll(() => state.swapBodies)
      .toContainEqual({
        targetUserId: 20,
        reason: 'Cambio coordinado con Gerente B.',
      });
    await expect(
      page.getByText(
        'Cambio propuesto a Gerente B; pendiente de aprobación administrativa.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Solicitar cambio' })
    ).toHaveCount(0);
    expect(state.usersLookupCalls).toBe(0);
  });
});
