import {
  expect,
  request as playwrightRequest,
  test,
  type Route,
} from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';
const API_URL = `${APP_URL}/api/v1/`;
const TASK_ID = Number(process.env.E2E_WRITER_TASK_ID ?? 27855);
const TASK_URL = `${APP_URL}/#/especialidades/proyecto/9/etapa/32/presupuestos/tarea/${TASK_ID}`;

const version = {
  id: 'e2e-version-1',
  versionNumber: 1,
  originalName: '02.02.02D.BLOQUE B.docx',
  mimeType:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes: 1024,
  checksumSha256: 'a'.repeat(64),
  source: 'ORIGINAL_IMPORT',
  createdAt: '2026-08-11T12:00:00.000Z',
  createdBy: { id: 99, name: 'Usuario E2E' },
};

const login = async () => {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const response = await api.post('auth/login', {
    data: {
      dni: process.env.E2E_TASK_DNI ?? '73520253',
      password: process.env.E2E_TASK_PASSWORD ?? 'sistemas',
    },
  });
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  await api.dispose();
  return (body.token ?? body.user?.token) as string;
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

test('Writer abre directamente la cinta funcional y oculta la entrada Word', async ({
  page,
}, testInfo) => {
  const token = await login();
  const evidenceDirectory = path.join(
    process.cwd(),
    '.agent-local',
    'evidence',
    'writer-word-desktop'
  );
  await mkdir(evidenceDirectory, { recursive: true });
  let legacyCanvasGets = 0;
  let originalVersionBody: Record<string, unknown> | null = null;
  let officeSessionBody: Record<string, unknown> | null = null;
  let sourceFileId: number | null = null;
  let session: Record<string, unknown> | null = null;

  await page.addInitScript(value => {
    localStorage.setItem('token', value);
    localStorage.setItem(
      'budget-task-vertical-layout:selected-panels-v2',
      JSON.stringify([3])
    );
  }, token);

  await page.route('**/api/v1/subtasks/*/visit', route =>
    route.fulfill({ status: 204 })
  );

  await page.route('**/api/v1/task-documents/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/\/$/, '');
    const method = request.method();

    if (
      method === 'GET' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}`
    ) {
      legacyCanvasGets += 1;
      return json(route, { document: null });
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
      method === 'POST' &&
      pathname ===
        `/api/v1/task-documents/subtasks/${TASK_ID}/file-versions/original`
    ) {
      originalVersionBody = request.postDataJSON() as Record<string, unknown>;
      sourceFileId = Number(originalVersionBody.sourceFileId);
      return json(route, { version });
    }

    if (
      method === 'POST' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}/office-sessions`
    ) {
      officeSessionBody = request.postDataJSON() as Record<string, unknown>;
      sourceFileId = Number(officeSessionBody.sourceFileId);
      session = {
        id: 'e2e-office-session',
        binding: { documentId: 'e2e-document', sourceFileId },
        provider: 'WORD_DESKTOP',
        status: 'ACTIVE',
        expiresAt: '2099-01-01T00:00:00.000Z',
        editor: { id: 99, name: 'Usuario E2E' },
        version,
        wordDesktop: {
          launchUri: 'ms-word:ofe|u|http://localhost:8001/e2e-document.docx',
          secureTransport: false,
        },
      };
      return json(route, { session }, 201);
    }

    if (
      method === 'GET' &&
      pathname === '/api/v1/task-documents/office-sessions/e2e-office-session'
    ) {
      return json(route, { session });
    }

    if (
      method === 'GET' &&
      pathname === `/api/v1/task-documents/subtasks/${TASK_ID}/file-versions`
    ) {
      expect(Number(url.searchParams.get('sourceFileId'))).toBe(sourceFileId);
      return json(route, { versions: [version] });
    }

    if (
      method === 'DELETE' &&
      pathname === '/api/v1/task-documents/office-sessions/e2e-office-session'
    ) {
      return route.fulfill({ status: 204 });
    }

    return route.continue();
  });

  await page.goto(TASK_URL);

  const editor = page.getByRole('region', {
    name: 'Editor del documento de tarea',
  });
  await expect(editor).toBeVisible();
  await expect(page.getByLabel('Cinta de opciones del documento')).toBeVisible();
  await expect(page.getByTestId('dhyrium-writer-readonly-preview')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Original', exact: true })
  ).toHaveCount(0);
  await expect(page.getByTestId('task-document-entry')).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Editor DOCX de Dhyrium' })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Abrir en Microsoft Word', exact: true })
  ).toHaveCount(0);
  expect(legacyCanvasGets).toBeGreaterThan(0);
  expect(originalVersionBody).toBeNull();
  expect(officeSessionBody).toBeNull();

  const editorScreenshot = await editor.screenshot({
    path: path.join(evidenceDirectory, 'direct-functional-editor.png'),
  });
  await testInfo.attach('direct-functional-editor', {
    body: editorScreenshot,
    contentType: 'image/png',
  });
});
