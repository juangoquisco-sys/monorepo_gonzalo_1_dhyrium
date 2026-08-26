import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';
const TASK_ID = 27855;
const TASK_URL = `${APP_URL}/#/especialidades/proyecto/9/etapa/32/presupuestos/tarea/${TASK_ID}`;
const DOCX_NAME = '02.02.02D.BLOQUE B.docx';
const LOCAL_E2E_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '172.16.10.177',
]);

type Viewport = { width: number; height: number };
type OriginalResponse = 'success' | 'error';
type OfficePhase =
  | 'PREPARED'
  | 'CONTACTED'
  | 'LOCKED'
  | 'SAVED'
  | 'CLOSED'
  | 'EXPIRED'
  | 'CONFLICT'
  | 'FAILED';

interface MockOptions {
  withDocument?: boolean;
  originalResponse?: OriginalResponse;
  recoveredSession?: boolean;
  recoveredSessionWithoutLaunchUri?: boolean;
  sessionPhase?: OfficePhase;
}

interface MockState {
  contentVersionGets: number[];
  legacyCanvasGets: number;
  officeSessionDeletes: number;
  officeSessionGets: number;
  officeSessionPosts: number;
  originalVersionPosts: number;
  originalSourceFileIds: number[];
  previewPosts: number;
  sessionPhase: OfficePhase;
  unexpectedApiRequests: string[];
}

const SOURCE_FILE_ID = 501;
const OFFICE_ACTIONS = [
  'Original',
  'Abrir en Word',
  'Versiones',
  'Word',
  'PDF',
] as const;

const sourceFile = {
  id: SOURCE_FILE_ID,
  dir: './uploads/editables/e2e',
  name: 'documento-canonico.docx',
  originalname: DOCX_NAME,
  type: 'REVIEW',
};

const version = {
  id: 'canonical-word-version-1',
  versionNumber: 1,
  originalName: DOCX_NAME,
  mimeType:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes: 1024,
  checksumSha256: 'a'.repeat(64),
  source: 'ORIGINAL_IMPORT',
  createdAt: '2026-08-11T12:00:00.000Z',
  createdBy: { id: 99, name: 'Usuario E2E' },
};

const currentVersion = {
  ...version,
  id: 'canonical-word-version-2',
  versionNumber: 2,
  checksumSha256: 'b'.repeat(64),
  source: 'WORD_DESKTOP',
  createdAt: '2026-08-11T12:05:00.000Z',
};

const OFFICE_SESSION_ID = 'word-session-e2e-1';
const OFFICE_SESSION_STORAGE_KEY = `dhyrium-word-session-v1:subtasks:${TASK_ID}:${SOURCE_FILE_ID}`;
const WORD_LAUNCH_URI =
  'ms-word:ofe|u|http://127.0.0.1:8081/api/v1/task-documents/office-webdav/word-session-e2e-1/document.docx';

const officeSession = (phase: OfficePhase) => ({
  id: OFFICE_SESSION_ID,
  binding: {
    documentId: 'canonical-document-e2e',
    sourceFileId: SOURCE_FILE_ID,
  },
  provider: 'WORD_DESKTOP',
  status:
    phase === 'CLOSED'
      ? 'RELEASED'
      : phase === 'EXPIRED'
      ? 'EXPIRED'
      : phase === 'CONFLICT'
      ? 'CONFLICT'
      : phase === 'FAILED'
      ? 'FAILED'
      : phase === 'SAVED'
      ? 'SAVED'
      : 'ACTIVE',
  phase,
  lastActivity: phase === 'PREPARED' ? null : '2026-08-11T12:06:00.000Z',
  lastHeartbeatAt:
    phase === 'LOCKED' || phase === 'SAVED' ? '2026-08-11T12:06:10.000Z' : null,
  expiresAt: '2026-08-11T12:20:00.000Z',
  hardExpiresAt: '2026-08-11T13:00:00.000Z',
  lockActive: phase === 'LOCKED' || phase === 'SAVED',
  versionReceipt:
    phase === 'SAVED' || phase === 'CLOSED'
      ? {
          id: currentVersion.id,
          versionNumber: currentVersion.versionNumber,
          checksumSha256: currentVersion.checksumSha256,
          createdAt: currentVersion.createdAt,
        }
      : null,
  title: DOCX_NAME,
  editor: { id: 99, name: 'Usuario E2E' },
  version: currentVersion,
  wordDesktop: {
    launchUri: WORD_LAUNCH_URI,
    secureTransport: false,
  },
});

const profile = {
  id: 99,
  email: 'writer-e2e@example.test',
  password: '',
  isSystemUser: false,
  profile: {
    id: 99,
    firstName: 'Usuario',
    lastName: 'E2E',
    dni: '00000099',
    phone: '',
    userId: 99,
    degree: 'Titulado',
    description: '',
    job: { abrv: 'ING', label: 'Ingeniero', value: 'ING', amount: 0 },
    department: 'Lima',
    province: 'Lima',
    district: 'Lima',
    addressRef: '',
    firstNameRef: '',
    lastNameRef: '',
    phoneRef: '',
    room: '',
    userPc: '',
    gender: '',
  },
  role: {
    id: 7,
    name: 'EMPLOYEE',
    menuPoints: [
      {
        id: 1,
        route: 'especialidades',
        path: '/especialidades',
        title: 'Especialidades',
        typeRol: 'USER',
        menu: [],
      },
    ],
  },
  roleId: 7,
  status: true,
  contract: null,
  cv: null,
  declaration: null,
  isAccessReception: false,
  offices: [],
  withdrawalDeclaration: null,
  ruc: '',
  address: '',
  userType: 'INTERINO',
};

const project = {
  id: 9,
  name: 'Proyecto E2E',
  stages: [],
  specialityId: 1,
  userId: 99,
  hasAccessInStage: false,
  useSessionId: 99,
};

const level = {
  id: 32,
  item: '1',
  name: 'Estructuras',
  rootId: 0,
  budget: 0,
  level: 1,
  spending: 0,
  stayPrice: 0,
  valueCost: 0,
  monthlyPrice: 0,
  balance: 0,
  price: 0,
  isArea: false,
  isInclude: false,
  isProject: true,
  stagesId: 32,
  details: {
    UNRESOLVED: 0,
    PROCESS: 0,
    INREVIEW: 1,
    DENIED: 0,
    DONE: 0,
    LIQUIDATION: 0,
    TOTAL: 1,
  },
  subTasks: [],
  userId: 99,
  projectName: 'Proyecto E2E',
  cover: false,
  unique: false,
  nextLevel: [],
  percentage: 0,
  managerGroup: [],
  total: 0,
  days: 1,
  rootTypeItem: 'BUDGET',
  participantSummary: [],
};

const task = (withDocument: boolean) => ({
  id: TASK_ID,
  status: 'INREVIEW',
  managerGroup: [],
  name: 'MEMORIA DE CALCULO BLOQUE B',
  item: '02.02.02D',
  feedBacks: [],
  percentage: 0,
  percentageWithoutActive: 0,
  description: '',
  price: '0',
  days: 1,
  files: { MODEL: [], UPLOADS: [], REVIEW: [] },
  taskId: 1,
  indexTaskId: 1,
  Levels: {
    userId: 99,
    stages: {
      id: 32,
      name: 'Etapa E2E',
      startDate: '2026-08-01T00:00:00.000Z',
      untilDate: '2026-08-31T00:00:00.000Z',
      _count: { levels: 1 },
      group: null,
    },
  },
  participantSummary: [],
  users: { ACTIVE: [] },
  mods: [],
  lastFeedback: {
    id: 700,
    comment: null,
    status: true,
    createdAt: '2026-08-11T12:00:00.000Z',
    updatedAt: '2026-08-11T12:00:00.000Z',
    subTasksId: TASK_ID,
    percentage: 0,
    files: withDocument ? [sourceFile] : [],
    users: [],
  },
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const newMockState = (): MockState => ({
  contentVersionGets: [],
  legacyCanvasGets: 0,
  officeSessionDeletes: 0,
  officeSessionGets: 0,
  officeSessionPosts: 0,
  originalVersionPosts: 0,
  originalSourceFileIds: [],
  previewPosts: 0,
  sessionPhase: 'PREPARED',
  unexpectedApiRequests: [],
});

const installIsolatedApi = async (
  page: Page,
  options: MockOptions = {}
): Promise<MockState> => {
  const withDocument = options.withDocument ?? true;
  const originalResponse = options.originalResponse ?? 'success';
  const state = newMockState();
  state.sessionPhase = options.sessionPhase ?? 'PREPARED';

  await page.addInitScript(
    ({ recoveredSession, sessionKey, sessionId }) => {
      localStorage.setItem('token', 'writer-workspace-e2e-token');
      localStorage.setItem(
        'budget-task-vertical-layout:selected-panels-v2',
        JSON.stringify([3])
      );
      if (recoveredSession) {
        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            id: sessionId,
            launchRequestedAt: '2026-08-11T12:05:30.000Z',
          })
        );
      }
    },
    {
      recoveredSession: options.recoveredSession ?? false,
      sessionKey: OFFICE_SESSION_STORAGE_KEY,
      sessionId: OFFICE_SESSION_ID,
    }
  );

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/\/$/, '');
    const method = request.method();

    if (method === 'GET' && pathname === '/api/v1/profile') {
      return json(route, profile);
    }

    if (method === 'GET' && pathname === '/api/v1/sector') {
      return json(route, []);
    }

    if (method === 'GET' && pathname === '/api/v1/projects/9') {
      return json(route, project);
    }

    if (method === 'POST' && pathname === '/api/v1/stages/32/visit') {
      return route.fulfill({ status: 204 });
    }

    if (method === 'GET' && pathname === '/api/v1/stages/32') {
      return json(route, level);
    }

    if (method === 'POST' && pathname === `/api/v1/subtasks/${TASK_ID}/visit`) {
      return route.fulfill({ status: 204 });
    }

    if (method === 'GET' && pathname === `/api/v1/subtasks/${TASK_ID}`) {
      return json(route, task(withDocument));
    }

    if (
      method === 'GET' &&
      pathname === `/api/v1/subtasks/${TASK_ID}/assignment-context`
    ) {
      return json(route, {
        source: 'UNIT',
        migrationRequired: false,
        unit: null,
        members: [],
        evaluators: [],
        allActiveUsers: [],
      });
    }

    if (
      method === 'GET' &&
      pathname === '/api/v1/task-documents/office-capabilities'
    ) {
      return json(route, {
        canonicalFormat: 'DOCX',
        wordDesktop: { available: true, secureTransport: false },
      });
    }

    if (
      method === 'GET' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}`
    ) {
      state.legacyCanvasGets += 1;
      return json(route, { document: null });
    }

    if (
      method === 'GET' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}/versions`
    ) {
      return json(route, { versions: [] });
    }

    if (
      method === 'POST' &&
      pathname ===
        `/api/v1/task-documents/subtasks/${TASK_ID}/file-versions/original`
    ) {
      state.originalVersionPosts += 1;
      const body = request.postDataJSON() as { sourceFileId?: number };
      state.originalSourceFileIds.push(Number(body.sourceFileId));

      if (originalResponse === 'error') {
        return json(
          route,
          { message: 'Fallo E2E al registrar el DOCX original.' },
          500
        );
      }

      return json(route, { version });
    }

    if (
      method === 'GET' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}/file-versions`
    ) {
      return json(route, { versions: [currentVersion, version] });
    }

    if (
      method === 'GET' &&
      pathname.startsWith(
        `/api/v1/task-documents/subtasks/${TASK_ID}/file-versions/`
      ) &&
      pathname.endsWith('/content')
    ) {
      const match = pathname.match(/file-versions\/(\d+)\/content$/);
      state.contentVersionGets.push(Number(match?.[1]));
      return route.fulfill({
        status: 200,
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: Buffer.from('mock-docx-for-readonly-preview'),
      });
    }

    if (
      method === 'POST' &&
      pathname === '/api/v1/task-documents/preview/docx-to-pdf'
    ) {
      state.previewPosts += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { 'x-document-page-count': '1' },
        body: Buffer.from('%PDF-1.4\n%%EOF\n'),
      });
    }

    if (
      method === 'POST' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}/office-sessions`
    ) {
      state.officeSessionPosts += 1;
      return json(route, { session: officeSession(state.sessionPhase) });
    }

    if (
      method === 'GET' &&
      pathname === `/api/v1/task-documents/office-sessions/${OFFICE_SESSION_ID}`
    ) {
      state.officeSessionGets += 1;
      const recoveredSession = officeSession(state.sessionPhase);
      if (options.recoveredSessionWithoutLaunchUri) {
        const sessionWithoutLaunchUri: Partial<typeof recoveredSession> = {
          ...recoveredSession,
        };
        delete sessionWithoutLaunchUri.wordDesktop;
        return json(route, { session: sessionWithoutLaunchUri });
      }
      return json(route, { session: recoveredSession });
    }

    if (
      method === 'DELETE' &&
      pathname === `/api/v1/task-documents/office-sessions/${OFFICE_SESSION_ID}`
    ) {
      state.officeSessionDeletes += 1;
      state.sessionPhase = 'CLOSED';
      return route.fulfill({ status: 204 });
    }

    state.unexpectedApiRequests.push(`${method} ${pathname}`);
    return json(route, method === 'GET' ? [] : {});
  });

  return state;
};

const expectInsideBrowserViewport = async (locator: Locator, page: Page) => {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box, 'El elemento debe tener geometria visible.').not.toBeNull();
  expect(viewport, 'La prueba necesita un viewport definido.').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
};

const expectContainedBy = async (child: Locator, parent: Locator) => {
  await expect(child).toBeVisible();
  await expect(parent).toBeVisible();
  const childBox = await child.boundingBox();
  const parentBox = await parent.boundingBox();

  expect(childBox).not.toBeNull();
  expect(parentBox).not.toBeNull();
  expect(childBox!.x).toBeGreaterThanOrEqual(parentBox!.x - 1);
  expect(childBox!.y).toBeGreaterThanOrEqual(parentBox!.y - 1);
  expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(
    parentBox!.x + parentBox!.width + 1
  );
  expect(childBox!.y + childBox!.height).toBeLessThanOrEqual(
    parentBox!.y + parentBox!.height + 1
  );
};

const expectSingleWorkspace = async (page: Page) => {
  const workspace = page.getByRole('region', {
    name: 'Editor de documentos Word de Dhyrium',
    exact: true,
  });
  await expect(workspace).toHaveCount(1, { timeout: 45_000 });
  await expect(workspace).toHaveAttribute(
    'data-testid',
    'dhyrium-writer-workspace'
  );
  await expect(workspace).toBeVisible();

  const header = workspace.getByTestId('dhyrium-writer-header');
  const documentSelect = header.getByTestId('dhyrium-writer-document-select');
  const documentViewport = workspace.getByTestId('dhyrium-writer-viewport');
  await expect(header).toHaveCount(1);
  await expect(header).toBeVisible();
  await expect(documentSelect).toHaveCount(1);
  await expect(documentSelect).toBeVisible();
  await expect(documentViewport).toHaveCount(1);
  await expect(documentViewport).toBeVisible();

  for (const actionName of OFFICE_ACTIONS) {
    const action = workspace.locator('button, a').filter({
      hasText: new RegExp(`^\\s*${actionName}\\s*$`, 'i'),
    });
    await expect(action, `Accion unica: ${actionName}`).toHaveCount(1);
    await expect(action).toBeVisible();
  }

  await expect(page.getByTestId('task-document-entry')).toHaveCount(0);
  await expect(page.locator('.office-document-editor__word-state')).toHaveCount(
    0
  );
  await expect(
    page
      .locator('.office-document-editor__page-state')
      .filter({ hasText: /^Documento preparado para Microsoft Word/i })
  ).toHaveCount(0);
  await expect(page.locator('.task-document-editor--canvas')).toHaveCount(0);
  await expect(page.locator('.canvas-word-ribbon')).toHaveCount(0);
  await expectInsideBrowserViewport(workspace, page);

  const horizontalGeometry = await workspace.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(horizontalGeometry.scrollWidth).toBeLessThanOrEqual(
    horizontalGeometry.clientWidth + 1
  );

  return { workspace, header, documentSelect, documentViewport };
};

const expectWordHomeRibbon = async (page: Page) => {
  const workspace = page.getByTestId('dhyrium-writer-workspace');
  const ribbon = workspace.getByTestId('office-word-ribbon');
  await expect(ribbon).toHaveCount(1);
  await expect(ribbon).toHaveAccessibleName(
    'Cinta de referencia para Microsoft Word'
  );
  await expect(ribbon).toBeVisible();

  const homeTab = ribbon.getByRole('tab', { name: 'Inicio', exact: true });
  await expect(homeTab).toHaveAttribute('aria-selected', 'true');

  const home = ribbon.getByTestId('office-word-ribbon-home');
  await expect(home).toHaveCount(1);
  await expect(home).toBeVisible();

  const visibleGroups: Locator[] = [];
  for (const label of [
    'Portapapeles',
    'Fuente',
    'Párrafo',
    'Estilos',
    'Edición',
  ]) {
    const group = home.getByRole('group', { name: label, exact: true });
    await expect(group, `Grupo visible de Inicio: ${label}`).toHaveCount(1);
    await expect(group).toBeVisible();
    visibleGroups.push(group);
  }

  const fontGroup = home.getByRole('group', { name: 'Fuente', exact: true });
  await expect(
    fontGroup.getByRole('button', {
      name: 'Fuente: Calibri (Cuerpo)',
      exact: true,
    })
  ).toBeVisible();
  await expect(
    fontGroup.getByRole('button', {
      name: 'Tamaño de fuente: 11',
      exact: true,
    })
  ).toBeVisible();

  for (const label of [
    'Pegar',
    'Cortar',
    'Copiar',
    'Copiar formato',
    'Negrita',
    'Cursiva',
    'Subrayado',
    'Color de fuente',
    'Viñetas',
    'Numeración',
    'Lista multinivel',
    'Alinear a la izquierda',
    'Centrar',
    'Alinear a la derecha',
    'Justificar',
    'Buscar',
    'Reemplazar',
    'Seleccionar',
  ]) {
    const command = home.getByRole('button', { name: label, exact: true });
    await expect(command, `Comando visible de Inicio: ${label}`).toHaveCount(1);
    await expect(command).toBeVisible();
    await expect(command).toHaveAttribute('aria-disabled', 'true');
  }

  const commandButtons = home.locator('button[data-ribbon-command]');
  expect(await commandButtons.count()).toBeGreaterThan(30);
  for (const command of await commandButtons.all()) {
    await expect(command).toBeVisible();
    await expect(command).toHaveAttribute('aria-disabled', 'true');
  }

  const styleCards = home.locator('.office-word-ribbon__style-card');
  await expect(styleCards).toHaveCount(5);
  for (const styleCard of await styleCards.all()) {
    await expect(styleCard).toHaveAttribute('aria-disabled', 'true');
  }

  const ribbonWidth = await ribbon.evaluate(element => element.clientWidth);
  const alwaysVisibleStyles = [
    'Estilo Normal',
    'Estilo Sin espacio',
    'Estilo Título 1',
  ];
  for (const label of alwaysVisibleStyles) {
    await expect(
      home.getByRole('button', { name: label, exact: true })
    ).toBeVisible();
  }
  for (const label of ['Estilo Título 2', 'Estilo Título']) {
    const style = home.getByRole('button', { name: label, exact: true });
    if (ribbonWidth <= 1180) {
      await expect(style).toBeHidden();
    } else {
      await expect(style).toBeVisible();
    }
  }
  await expect(
    home.getByRole('button', { name: 'Más estilos', exact: true })
  ).toBeVisible();

  const iconCount = await home
    .locator('.office-word-ribbon__command-icon > svg')
    .count();
  expect(iconCount).toBeGreaterThan(25);
  expect(
    await home.locator('.office-word-ribbon__command-icon').allTextContents()
  ).toEqual(Array(iconCount).fill(''));

  const splitButtons = home.locator(
    '.office-word-ribbon__command.is-split[data-ribbon-command]'
  );
  expect(await splitButtons.count()).toBeGreaterThan(8);
  for (const splitButton of await splitButtons.all()) {
    await expect(splitButton).toHaveAttribute('aria-disabled', 'true');
  }

  const paste = home.getByRole('button', { name: 'Pegar', exact: true });
  const reasonId = await paste.getAttribute('aria-describedby');
  expect(reasonId).toBeTruthy();
  await expect(page.locator(`[id="${reasonId}"]`)).toContainText(
    /Vista previa no editable.*Microsoft Word/i
  );
  await paste.focus();
  await expect(paste).toBeFocused();

  const panel = ribbon.getByRole('tabpanel');
  const geometry = await ribbon.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  const panelGeometry = await panel.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(panelGeometry.scrollWidth).toBeLessThanOrEqual(
    panelGeometry.clientWidth + 1
  );
  for (const group of visibleGroups) {
    await expectContainedBy(group, panel);
  }

  const documentGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(documentGeometry.scrollWidth).toBeLessThanOrEqual(
    documentGeometry.clientWidth + 1
  );

  return ribbon;
};

const selectCanonicalDocx = async (
  page: Page,
  header: Locator,
  documentSelect: Locator
) => {
  await expect(documentSelect).toHaveAccessibleName(/documento/i);
  await documentSelect.click();
  const docxOption = page.getByRole('button', {
    name: `Seleccionar ${DOCX_NAME}`,
    exact: true,
  });
  await expect(docxOption).toHaveCount(1);
  await expect(docxOption).toBeVisible();
  await docxOption.click();
  await expect(header).toContainText(DOCX_NAME);
};

test.beforeAll(() => {
  const host = new URL(APP_URL).hostname;
  if (!LOCAL_E2E_HOSTS.has(host)) {
    throw new Error(
      `La prueba aislada de Writer solo puede usar el frontend local; recibido: ${host}`
    );
  }
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
] satisfies Viewport[]) {
  test(`DOCX canonico conserva un unico workspace responsive a ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const state = await installIsolatedApi(page);

    await page.goto(TASK_URL);

    const { header, documentSelect } = await expectSingleWorkspace(page);
    await selectCanonicalDocx(page, header, documentSelect);
    await expectSingleWorkspace(page);
    const ribbon = await expectWordHomeRibbon(page);
    await testInfo.attach(`inicio-word-${viewport.width}`, {
      body: await ribbon.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
    await expect.poll(() => state.originalVersionPosts).toBe(1);
    expect(state.originalSourceFileIds).toEqual([SOURCE_FILE_ID]);
    await expect.poll(() => state.officeSessionPosts).toBe(1);

    const launch = page.getByTestId('dhyrium-writer-word-launch');
    await expect(launch).toHaveAttribute('href', WORD_LAUNCH_URI);
    await expect(page.getByTestId('dhyrium-writer-http-warning')).toHaveText(
      'HTTP solo para desarrollo; edición fluida/producción requiere HTTPS confiable.'
    );

    const preview = page.getByTestId('dhyrium-writer-readonly-preview');
    await expect(preview).toHaveAttribute('data-preview-kind', 'current');
    await expect(preview).toContainText('versión vigente v2');
    await expect.poll(() => state.contentVersionGets.includes(2)).toBe(true);
    expect(state.contentVersionGets[0]).toBe(2);

    await header.getByRole('button', { name: 'Original', exact: true }).click();
    await expect(preview).toHaveAttribute('data-preview-kind', 'original');
    await expect(preview).toContainText('Original protegido · solo lectura');
    await expect.poll(() => state.contentVersionGets.includes(1)).toBe(true);
    await preview
      .getByRole('button', { name: 'Ver versión vigente', exact: true })
      .click();
    await expect(preview).toHaveAttribute('data-preview-kind', 'current');
    expect(state.legacyCanvasGets).toBe(0);
  });
}

test('el enlace directo espera actividad real y consume todas las fases de Word', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const state = await installIsolatedApi(page);

  await page.goto(TASK_URL);
  const { header, documentSelect } = await expectSingleWorkspace(page);
  await selectCanonicalDocx(page, header, documentSelect);

  const launch = page.getByTestId('dhyrium-writer-word-launch');
  await expect(launch).toHaveAttribute('href', WORD_LAUNCH_URI);
  await launch.evaluate(element => {
    element.addEventListener('click', event => event.preventDefault(), {
      capture: true,
    });
  });
  await launch.click();

  const sessionBar = page.getByTestId('dhyrium-writer-word-session');
  await expect(sessionBar).toContainText(
    'Esperando que Microsoft Word contacte a Dhyrium'
  );
  expect(state.officeSessionDeletes).toBe(0);
  await expect(
    sessionBar.getByRole('link', { name: 'Reintentar apertura', exact: true })
  ).toHaveAttribute('href', WORD_LAUNCH_URI);

  state.sessionPhase = 'CONTACTED';
  await expect(sessionBar).toContainText(
    'Microsoft Word contactó con Dhyrium',
    { timeout: 8_000 }
  );
  expect(state.officeSessionDeletes).toBe(0);

  state.sessionPhase = 'LOCKED';
  await expect(sessionBar).toContainText('Edición activa en Microsoft Word', {
    timeout: 8_000,
  });
  expect(state.officeSessionDeletes).toBe(0);

  state.sessionPhase = 'SAVED';
  await expect(sessionBar).toContainText(
    'Guardado recibido desde Microsoft Word',
    { timeout: 8_000 }
  );
  expect(state.officeSessionDeletes).toBe(0);

  state.sessionPhase = 'CLOSED';
  await expect(sessionBar).toContainText('Sesión de Microsoft Word cerrada', {
    timeout: 8_000,
  });
  expect(state.officeSessionGets).toBeGreaterThan(0);
  await expect(page.getByTestId('dhyrium-writer-word-launch')).toHaveCount(0);
});

test('libera una preparación no iniciada al desmontar el workspace', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const state = await installIsolatedApi(page);

  await page.goto(TASK_URL);
  const { header, documentSelect } = await expectSingleWorkspace(page);
  await selectCanonicalDocx(page, header, documentSelect);
  await expect.poll(() => state.officeSessionPosts).toBe(1);
  await expect(page.getByTestId('dhyrium-writer-word-session')).toContainText(
    'Sesión preparada para Microsoft Word'
  );
  expect(state.officeSessionDeletes).toBe(0);

  await documentSelect.click();
  await page.getByTestId('open-legacy-document-editor').click();

  await expect.poll(() => state.officeSessionDeletes).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        key => window.localStorage.getItem(key),
        OFFICE_SESSION_STORAGE_KEY
      )
    )
    .toBeNull();
});

test('reconecta una sesión persistida y permite liberarla sin crear otra', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const state = await installIsolatedApi(page, {
    recoveredSession: true,
    sessionPhase: 'CONTACTED',
  });

  await page.goto(TASK_URL);
  const { header, documentSelect } = await expectSingleWorkspace(page);
  await selectCanonicalDocx(page, header, documentSelect);

  const sessionBar = page.getByTestId('dhyrium-writer-word-session');
  await expect(sessionBar).toContainText(
    'Microsoft Word contactó con Dhyrium',
    { timeout: 8_000 }
  );
  expect(state.officeSessionPosts).toBe(0);
  expect(state.officeSessionGets).toBeGreaterThan(0);

  await sessionBar
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect.poll(() => state.officeSessionDeletes).toBe(1);
  await expect(sessionBar).toContainText('Sesión de Microsoft Word cerrada');
});

test('al recargar descarta localmente una PREPARED sin enlace y permite preparar otra', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const state = await installIsolatedApi(page, {
    recoveredSession: true,
    recoveredSessionWithoutLaunchUri: true,
    sessionPhase: 'PREPARED',
  });

  await page.goto(TASK_URL);
  const { header, documentSelect } = await expectSingleWorkspace(page);
  await selectCanonicalDocx(page, header, documentSelect);

  const sessionBar = page.getByTestId('dhyrium-writer-word-session');
  await expect(sessionBar).toContainText(
    'La sesión guardada no incluye un enlace reutilizable para Microsoft Word.'
  );
  await expect.poll(() => state.officeSessionGets).toBeGreaterThan(0);
  expect(state.officeSessionDeletes).toBe(0);
  expect(state.officeSessionPosts).toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        key => window.localStorage.getItem(key),
        OFFICE_SESSION_STORAGE_KEY
      )
    )
    .toBeNull();

  const prepareAgain = sessionBar.getByRole('button', {
    name: 'Preparar nueva sesión',
    exact: true,
  });
  await expect(prepareAgain).toBeEnabled();
  state.sessionPhase = 'PREPARED';
  await prepareAgain.click();

  await expect.poll(() => state.officeSessionPosts).toBe(1);
  expect(state.officeSessionDeletes).toBe(0);
  await expect(page.getByTestId('dhyrium-writer-word-launch')).toHaveAttribute(
    'href',
    WORD_LAUNCH_URI
  );
});

test('el estado sin documento permanece dentro del viewport unificado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const state = await installIsolatedApi(page, { withDocument: false });

  await page.goto(TASK_URL);

  const { documentViewport } = await expectSingleWorkspace(page);
  const emptyState = documentViewport.getByText(
    /(?:seleccione un documento Word|no (?:hay|se encontr[oó]).*(?:DOCX|documento)|sin (?:un )?documento)/i
  );
  await expect(emptyState).toHaveCount(1);
  await expectContainedBy(emptyState, documentViewport);
  await expectInsideBrowserViewport(emptyState, page);
  expect(state.originalVersionPosts).toBe(0);
  expect(state.legacyCanvasGets).toBe(0);
});

test('el error de preparacion permanece dentro del viewport unificado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const state = await installIsolatedApi(page, {
    originalResponse: 'error',
  });

  await page.goto(TASK_URL);

  const { header, documentSelect } = await expectSingleWorkspace(page);
  await selectCanonicalDocx(page, header, documentSelect);
  const { documentViewport } = await expectSingleWorkspace(page);
  const errorState = documentViewport.getByRole('alert');
  await expect(errorState).toHaveCount(1);
  await expect(errorState).toContainText(/No se pudo preparar el documento/i);
  await expectContainedBy(errorState, documentViewport);
  await expectInsideBrowserViewport(errorState, page);
  await expect.poll(() => state.originalVersionPosts).toBe(1);
  expect(state.originalSourceFileIds).toEqual([SOURCE_FILE_ID]);
  expect(state.legacyCanvasGets).toBe(0);
});
