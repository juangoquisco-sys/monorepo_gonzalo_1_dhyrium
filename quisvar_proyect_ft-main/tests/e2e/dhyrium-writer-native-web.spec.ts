import {
  expect,
  request as playwrightRequest,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';
const API_URL = `${APP_URL}/api/v1/`;
const TASK_ID = Number(process.env.E2E_WRITER_TASK_ID ?? 27855);
const TASK_URL = `${APP_URL}/#/especialidades/proyecto/9/etapa/32/presupuestos/tarea/${TASK_ID}`;
const ASSET_FILE_NAME = '11111111-1111-4111-8111-111111111111.png';
const PROTECTED_ASSET_PATH = `/api/v1/task-documents/subtasks/${TASK_ID}/assets/${ASSET_FILE_NAME}`;
const EXTERNAL_ASSET_URL = `https://attacker.invalid/api/v1/task-documents/subtasks/${TASK_ID}/assets/${ASSET_FILE_NAME}`;
const DOCX_NO_SOURCE_MESSAGE =
  'Sin archivo DOCX seleccionado; el documento original permanece protegido.';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XTBzAAAAAElFTkSuQmCC',
  'base64'
);

const login = async () => {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const response = await api.post('auth/login', {
    data: {
      dni: process.env.E2E_TASK_DNI ?? '73520253',
      password: process.env.E2E_TASK_PASSWORD ?? 'sistemas',
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  await api.dispose();
  return (body.token ?? body.user?.token) as string;
};

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const expectNativeSurface = async (
  page: Page,
  verifyExpandedHomeCommands = true
) => {
  const editor = page.getByRole('region', {
    name: 'Editor del documento de tarea',
  });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('data-editor-engine', 'canvas-editor');
  await expect(
    editor.getByText('Dhyrium Writer · editor web independiente', {
      exact: true,
    })
  ).toBeVisible();

  const status = editor.getByTestId('dhyrium-writer-native-status');
  await expect(status).toBeVisible();
  await expect(status).toContainText('Motor Dhyrium activo');
  await expect(status).toContainText('Exportar DOCX · compatibilidad básica');
  await expect(editor.getByTestId('docx-import-status-message')).toHaveText(
    DOCX_NO_SOURCE_MESSAGE
  );
  await expect(
    editor.locator(
      'input[type="file"][accept*=".docx"], input[type="file"][accept*="wordprocessingml"]'
    )
  ).toHaveCount(0);
  await expect(
    editor.locator('.task-document-editor__canvas .ce-page-container > canvas')
  ).toBeVisible();

  await expect(editor.locator('a[href^="ms-word:"]')).toHaveCount(0);
  await expect(
    editor.locator('.office-word-ribbon, [data-office-word-ribbon]')
  ).toHaveCount(0);

  const ribbon = editor.getByLabel('Cinta de opciones del documento');
  await expect(ribbon).toBeVisible();
  if (verifyExpandedHomeCommands) {
    for (const commandId of [
      'home.paragraph.multilevel',
      'home.paragraph.outdent',
      'home.paragraph.indent',
      'home.paragraph.shading',
      'home.paragraph.borders',
    ]) {
      await expect(
        ribbon.locator(`[data-command-id="${commandId}"]`).first(),
        `${commandId} debe continuar bloqueado hasta ser fiel`
      ).toBeDisabled();
    }
  }

  return { editor, ribbon };
};

const selectAllDocument = async (page: Page, editor: Locator) => {
  const canvas = editor
    .locator('.task-document-editor__canvas .ce-page-container > canvas')
    .first();
  await canvas.click({ position: { x: 120, y: 100 } });
  await page.keyboard.press('Control+a');
};

test('H01-WEB: un DOCX adjunto queda bloqueado sin descargar, importar ni autoguardar', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const token = await login();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const docxRequests: string[] = [];
  const importerRequests: string[] = [];
  const documentMutations: string[] = [];
  const sourceDocument = {
    id: 'writer-docx-blocked',
    taskKind: 'subtasks',
    taskId: TASK_ID,
    title: 'documento-nativo-dhyrium',
    contentJson: {
      type: 'canvas-editor',
      schemaVersion: 2,
      editorVersion: '1.0.0',
      data: { main: [{ value: 'Contenido nativo preservado\n' }] },
    },
    contentHtml: '<p>Contenido nativo preservado</p>',
    plainText: 'Contenido nativo preservado',
    revision: 1,
    versionNumber: 1,
    updatedAt: '2026-08-11T12:00:00.000Z',
    updatedBy: { id: 73, name: 'Usuario local' },
  };

  await context.addInitScript(value => {
    localStorage.setItem('token', value);
    localStorage.setItem(
      'budget-task-vertical-layout:selected-panels-v2',
      JSON.stringify([3, 4])
    );
  }, token);

  context.on('request', request => {
    const requestUrl = request.url().toLowerCase();
    if (requestUrl.includes('.docx')) docxRequests.push(request.url());
    if (requestUrl.includes('mammoth')) importerRequests.push(request.url());
    if (
      requestUrl.includes(`/task-documents/subtasks/${TASK_ID}`) &&
      ['POST', 'PUT'].includes(request.method())
    ) {
      documentMutations.push(`${request.method()} ${request.url()}`);
    }
  });

  await context.route(
    `**/api/v1/task-documents/subtasks/${TASK_ID}`,
    async route => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { document: sourceDocument });
        return;
      }
      await route.abort();
    }
  );

  const page = await context.newPage();
  await page.goto(TASK_URL);
  await expectNativeSurface(page, false);

  const sourceFileButton = page.getByRole('button', {
    name: /Revisar compatibilidad de .*\.docx en Dhyrium Writer/i,
  });
  await expect(sourceFileButton).toHaveCount(1);
  await sourceFileButton.evaluate((button: HTMLButtonElement) =>
    button.click()
  );

  const { editor, ribbon } = await expectNativeSurface(page, false);
  await ribbon.getByRole('tab', { name: 'Archivo', exact: true }).click();
  const backstage = editor.getByLabel('Archivo del documento');
  await backstage.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(backstage.getByText(DOCX_IMPORT_BLOCKED_MESSAGE)).toBeVisible();
  await expect(
    backstage.getByRole('button', { name: /Archivo adjunto de la tarea/i })
  ).toBeDisabled();
  await expect(
    backstage.getByRole('button', { name: /Examinar este equipo/i })
  ).toBeDisabled();

  await page.waitForTimeout(1_500);
  expect(docxRequests).toEqual([]);
  expect(importerRequests).toEqual([]);
  expect(documentMutations).toEqual([]);
  await context.close();
});

test('H01-WEB: dos páginas editan y guardan con Canvas sin invocar Office', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const token = await login();
  const evidenceDirectory = path.join(
    process.cwd(),
    '.agent-local',
    'h01-web-native'
  );
  await mkdir(evidenceDirectory, { recursive: true });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const officeRequests: string[] = [];
  const externalAssetRequests: string[] = [];
  const assetAuthorizationHeaders: string[] = [];
  const savedPayloads: Array<Record<string, unknown>> = [];
  let storedDocument = {
    id: 'writer-native-web',
    taskKind: 'subtasks',
    taskId: TASK_ID,
    title: 'memoria-calculo.docx',
    contentJson: {
      type: 'canvas-editor',
      schemaVersion: 1,
      editorVersion: '1.0.0',
      data: {
        main: [
          {
            value: 'Documento independiente de Dhyrium.\n',
          },
          {
            type: 'hyperlink',
            value: '',
            url: EXTERNAL_ASSET_URL,
            valueList: [{ value: 'Enlace escrito, no recurso' }],
          },
          {
            type: 'image',
            value: PROTECTED_ASSET_PATH,
            width: 24,
            height: 24,
          },
        ],
      },
    },
    contentHtml: '<p>Documento independiente de Dhyrium</p>',
    plainText: 'Documento independiente de Dhyrium',
    revision: 1,
    versionNumber: 1,
    updatedAt: '2026-08-11T12:00:00.000Z',
    updatedBy: { id: 73, name: 'Usuario local' },
  };

  context.on('request', request => {
    if (
      request.url().includes('/office-sessions') ||
      request.url().startsWith('ms-word:')
    ) {
      officeRequests.push(request.url());
    }
    if (request.url().startsWith('https://attacker.invalid/')) {
      externalAssetRequests.push(request.url());
    }
  });

  await context.addInitScript(value => {
    localStorage.setItem('token', value);
    localStorage.setItem(
      'budget-task-vertical-layout:selected-panels-v2',
      JSON.stringify([3])
    );
  }, token);

  await context.route(`**${PROTECTED_ASSET_PATH}`, async route => {
    assetAuthorizationHeaders.push(
      route.request().headers()['authorization'] ?? ''
    );
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: ONE_PIXEL_PNG,
    });
  });

  await context.route(
    `**/api/v1/task-documents/subtasks/${TASK_ID}`,
    async route => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { document: storedDocument });
        return;
      }
      if (route.request().method() === 'PUT') {
        const payload = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        savedPayloads.push(payload);
        storedDocument = {
          ...storedDocument,
          title: String(payload.title ?? storedDocument.title),
          contentJson: payload.contentJson as typeof storedDocument.contentJson,
          contentHtml: String(payload.contentHtml ?? ''),
          plainText: String(payload.plainText ?? ''),
          revision: storedDocument.revision + 1,
          versionNumber: storedDocument.versionNumber + 1,
          updatedAt: new Date().toISOString(),
        };
        await fulfillJson(route, { document: storedDocument });
        return;
      }
      await route.abort();
    }
  );

  const pageA = await context.newPage();
  await pageA.goto(TASK_URL);
  const surfaceA = await expectNativeSurface(pageA);
  await pageA.screenshot({
    path: path.join(evidenceDirectory, 'dhyrium-writer-native-1440.png'),
  });
  await selectAllDocument(pageA, surfaceA.editor);
  await surfaceA.ribbon
    .locator('[data-command-id="home.paragraph.alignCenter"]')
    .click();
  const savesBeforeA = savedPayloads.length;
  await surfaceA.editor
    .locator('.task-document-editor__header')
    .getByRole('button', { name: 'Guardar', exact: true })
    .click();
  await expect.poll(() => savedPayloads.length).toBeGreaterThan(savesBeforeA);
  expect(JSON.stringify(storedDocument.contentJson)).toContain('center');
  expect(JSON.stringify(storedDocument.contentJson)).toContain(
    PROTECTED_ASSET_PATH
  );
  expect(JSON.stringify(storedDocument.contentJson)).toContain(
    EXTERNAL_ASSET_URL
  );
  expect(JSON.stringify(storedDocument.contentJson)).not.toContain('blob:');
  await pageA.close();

  const pageB = await context.newPage();
  await pageB.goto(TASK_URL);
  const surfaceB = await expectNativeSurface(pageB);
  await selectAllDocument(pageB, surfaceB.editor);
  await surfaceB.ribbon.locator('[data-command-id="home.font.bold"]').click();
  const savesBeforeB = savedPayloads.length;
  await pageB.goto(`${APP_URL}/#/home`);
  await expect.poll(() => savedPayloads.length).toBeGreaterThan(savesBeforeB);
  expect(JSON.stringify(storedDocument.contentJson)).toContain('bold');
  expect(JSON.stringify(storedDocument.contentJson)).not.toContain('blob:');

  await pageB.close();
  const authorizationCountAfterSafePages = assetAuthorizationHeaders.length;
  const rejectedDocuments = [
    [
      { value: 'Documento con recurso externo bloqueado\n' },
      {
        type: 'image',
        value: EXTERNAL_ASSET_URL,
        width: 24,
        height: 24,
      },
    ],
    [
      { value: 'Documento con blob persistido bloqueado\n' },
      {
        type: 'image',
        value: 'blob:https://dhyrium.invalid/recurso-no-durable',
        width: 24,
        height: 24,
      },
    ],
    [
      { value: 'Documento con iframe bloqueado\n' },
      {
        type: 'block',
        value: '',
        width: 560,
        height: 315,
        block: {
          type: 'iframe',
          iframeBlock: { src: 'https://attacker.invalid/embed' },
        },
      },
    ],
  ];
  for (const main of rejectedDocuments) {
    storedDocument = {
      ...storedDocument,
      contentJson: {
        ...storedDocument.contentJson,
        data: { main },
      } as typeof storedDocument.contentJson,
    };
    const rejectedAssetPage = await context.newPage();
    await rejectedAssetPage.goto(TASK_URL);
    const rejectedEditor = rejectedAssetPage.getByRole('region', {
      name: 'Editor del documento de tarea',
    });
    await expect(rejectedEditor).toBeVisible();
    await expect(
      rejectedEditor.getByTestId('dhyrium-writer-native-status')
    ).toContainText('No se pudo sincronizar con Dhyrium');
    await rejectedAssetPage.close();
  }

  storedDocument = {
    ...storedDocument,
    contentJson: {
      ...storedDocument.contentJson,
      data: {
        main: [
          { value: 'Documento con imagen raster inline permitida\n' },
          {
            type: 'image',
            value: `data:image/png;base64,${ONE_PIXEL_PNG.toString('base64')}`,
            width: 24,
            height: 24,
          },
        ],
      },
    } as typeof storedDocument.contentJson,
  };
  const inlineImagePage = await context.newPage();
  await inlineImagePage.goto(TASK_URL);
  await expectNativeSurface(inlineImagePage);
  await inlineImagePage.close();

  expect(officeRequests).toEqual([]);
  expect(externalAssetRequests).toEqual([]);
  expect(assetAuthorizationHeaders.length).toBe(
    authorizationCountAfterSafePages
  );
  expect(assetAuthorizationHeaders.length).toBeGreaterThanOrEqual(2);
  expect(
    assetAuthorizationHeaders.every(header => header.startsWith('Bearer '))
  ).toBe(true);
  expect(savedPayloads.length).toBeGreaterThanOrEqual(2);
  await context.close();
});
