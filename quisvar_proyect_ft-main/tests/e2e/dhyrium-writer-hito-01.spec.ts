import {
  expect,
  request as playwrightRequest,
  test,
  type Locator,
} from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';
const API_URL = `${APP_URL}/api/v1/`;
const TASK_ID = Number(process.env.E2E_WRITER_TASK_ID ?? 27855);
const TASK_URL = `${APP_URL}/#/especialidades/proyecto/9/etapa/32/presupuestos/tarea/${TASK_ID}`;

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

const assertRibbonGeometry = async (ribbon: Locator) => {
  const geometry = await ribbon.evaluate(element => {
    const panel = element.querySelector<HTMLElement>(
      '.canvas-word-ribbon__panel'
    );
    if (!panel) throw new Error('El panel activo de la cinta no está visible.');
    const panelRect = panel.getBoundingClientRect();
    const clipped = Array.from(panel.children)
      .filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          getComputedStyle(child).display !== 'none'
      )
      .filter(child => {
        const rect = child.getBoundingClientRect();
        return (
          rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1
        );
      })
      .map(child => child.dataset.ribbonGroupId ?? child.className);
    return {
      documentClientWidth: window.document.documentElement.clientWidth,
      documentScrollWidth: window.document.documentElement.scrollWidth,
      panelClientWidth: panel.clientWidth,
      panelScrollWidth: panel.scrollWidth,
      clipped,
    };
  });

  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
    geometry.documentClientWidth + 1
  );
  expect(geometry.panelScrollWidth).toBeLessThanOrEqual(
    geometry.panelClientWidth + 1
  );
  expect(geometry.clipped).toEqual([]);
};

test('Hito 01 legado: Inicio usa comandos registrados y una cinta adaptable y accesible', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const runtimeErrors: string[] = [];
  const consoleErrors: string[] = [];
  const unexpectedResponses: string[] = [];
  const evidenceDirectory = path.join(
    process.cwd(),
    '.agent-local',
    'evidence',
    'hito-01'
  );
  let savedPayload: Record<string, unknown> | null = null;
  let storedDocument = {
    id: 'writer-hito-01',
    taskKind: 'subtasks',
    taskId: TASK_ID,
    title: '02.02.02D.BLOQUE B.docx',
    contentJson: {
      type: 'canvas-editor',
      schemaVersion: 2,
      editorVersion: '1.0.0',
      data: {
        main: [
          { value: 'Documento ', bold: true },
          { value: 'de prueba del Hito 01\n' },
        ],
      },
      settings: { docxZonesImported: true },
    },
    contentHtml: '<p>Documento de prueba del Hito 01</p>',
    plainText: 'Documento de prueba del Hito 01',
    revision: 1,
    versionNumber: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: { id: 73, name: 'Usuario local' },
  };
  await mkdir(evidenceDirectory, { recursive: true });
  page.on('pageerror', error =>
    runtimeErrors.push(error.stack ?? error.message)
  );
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400)
      unexpectedResponses.push(`${response.status()} ${response.url()}`);
  });

  const token = await login();
  await page.route(
    `**/api/v1/task-documents/subtasks/${TASK_ID}`,
    async route => {
      if (route.request().method() === 'PUT') {
        savedPayload = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        storedDocument = {
          ...storedDocument,
          title: String(savedPayload.title ?? storedDocument.title),
          contentJson:
            savedPayload.contentJson as typeof storedDocument.contentJson,
          contentHtml: String(savedPayload.contentHtml ?? ''),
          plainText: String(savedPayload.plainText ?? ''),
          revision: storedDocument.revision + 1,
          versionNumber: storedDocument.versionNumber + 1,
          updatedAt: new Date().toISOString(),
        };
        await route.fulfill({
          status: 200,
          json: { document: storedDocument },
        });
        return;
      }
      if (route.request().method() !== 'GET') return route.continue();
      await route.fulfill({
        status: 200,
        json: { document: storedDocument },
      });
    }
  );
  await page.addInitScript(value => {
    localStorage.setItem('token', value);
    localStorage.setItem(
      'budget-task-vertical-layout:selected-panels-v2',
      JSON.stringify([3])
    );
  }, token);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(TASK_URL);

  const ribbon = page.getByLabel('Cinta de opciones del documento');
  await expect(ribbon).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('dhyrium-writer-readonly-preview')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Original', exact: true })
  ).toHaveCount(0);
  await expect(ribbon).toHaveAttribute('role', 'region');
  await expect(ribbon.getByRole('tab', { name: 'Inicio' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await ribbon.getByRole('tab', { name: 'Insertar' }).click();
  await ribbon.getByRole('button', { name: 'Editar encabezado' }).click();
  await expect(
    ribbon.getByRole('tab', { name: 'Encabezado y pie' })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    ribbon.getByRole('button', { name: 'Cerrar encabezado y pie de página' })
  ).toBeVisible();
  const headerToolsScreenshot = await ribbon.screenshot({
    path: path.join(evidenceDirectory, 'herramientas-encabezado-pie.png'),
  });
  await testInfo.attach('herramientas-encabezado-pie', {
    body: headerToolsScreenshot,
    contentType: 'image/png',
  });
  await ribbon
    .getByRole('button', { name: 'Cerrar encabezado y pie de página' })
    .click();
  await expect(ribbon.getByRole('tab', { name: 'Inicio' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  for (const group of [
    'Portapapeles',
    'Fuente',
    'Párrafo',
    'Estilos',
    'Edición',
  ]) {
    await expect(ribbon.getByText(group, { exact: true })).toBeVisible();
  }
  for (const commandId of [
    'home.clipboard.paste',
    'home.font.bold',
    'home.font.color',
    'home.paragraph.alignLeft',
    'home.paragraph.marks',
    'home.editing.find',
  ]) {
    await expect(
      ribbon.locator(`[data-command-id="${commandId}"]`)
    ).toHaveCount(1);
  }
  const expectedHomeCommandIds = [
    'home.clipboard.paste',
    'home.clipboard.cut',
    'home.clipboard.copy',
    'home.clipboard.formatPainter',
    'home.font.family',
    'home.font.size',
    'home.font.grow',
    'home.font.shrink',
    'home.font.changeCase',
    'home.font.clear',
    'home.font.bold',
    'home.font.italic',
    'home.font.underline',
    'home.font.strike',
    'home.font.subscript',
    'home.font.superscript',
    'home.font.color',
    'home.font.highlight',
    'home.paragraph.bullets',
    'home.paragraph.numbering',
    'home.paragraph.multilevel',
    'home.paragraph.outdent',
    'home.paragraph.indent',
    'home.paragraph.sort',
    'home.paragraph.marks',
    'home.paragraph.alignLeft',
    'home.paragraph.alignCenter',
    'home.paragraph.alignRight',
    'home.paragraph.justify',
    'home.paragraph.spacing',
    'home.paragraph.shading',
    'home.paragraph.borders',
    'home.styles.gallery',
    'home.editing.find',
    'home.editing.replace',
    'home.editing.select',
  ];
  for (const commandId of expectedHomeCommandIds) {
    await expect(
      ribbon.locator(`[data-command-id="${commandId}"]`).first(),
      commandId
    ).toBeAttached();
  }
  await expect(ribbon.getByRole('toolbar')).toHaveCount(5);
  const cutCommand = ribbon.locator('[data-command-id="home.clipboard.cut"]');
  await expect(cutCommand).toBeDisabled();
  await expect(cutCommand).toHaveAttribute(
    'aria-description',
    /Seleccione texto/
  );
  const paragraphBorderCommand = ribbon.locator(
    '[data-command-id="home.paragraph.borders"]'
  );
  await expect(paragraphBorderCommand).toBeDisabled();
  await expect(paragraphBorderCommand).toHaveAttribute(
    'aria-description',
    /no puede conservarse fielmente/
  );
  const unnamedControls = await ribbon
    .locator('button, input, select, [role="button"]')
    .evaluateAll(controls =>
      controls
        .filter(control => {
          const element = control as HTMLElement;
          const style = getComputedStyle(element);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            element.getBoundingClientRect().width > 0
          );
        })
        .filter(control => {
          const element = control as HTMLElement;
          return (
            !element.getAttribute('aria-label') &&
            !element.getAttribute('title') &&
            !element.textContent?.trim()
          );
        })
        .map(control => (control as HTMLElement).outerHTML.slice(0, 160))
    );
  expect(unnamedControls).toEqual([]);
  const accessibilitySession = await page.context().newCDPSession(page);
  await accessibilitySession.send('Accessibility.enable');
  const accessibilityTree = await accessibilitySession.send(
    'Accessibility.getFullAXTree'
  );
  const accessibilityRoles = accessibilityTree.nodes.map(node =>
    String(node.role?.value ?? '')
  );
  const accessibilityNames = accessibilityTree.nodes.map(node =>
    String(node.name?.value ?? '')
  );
  expect(accessibilityRoles).toContain('tablist');
  expect(accessibilityRoles).toContain('tabpanel');
  expect(
    accessibilityRoles.filter(role => role === 'toolbar').length
  ).toBeGreaterThanOrEqual(5);
  expect(accessibilityNames).toContain('Pestañas del editor');
  expect(accessibilityNames).toContain('Portapapeles');
  await accessibilitySession.detach();
  await assertRibbonGeometry(ribbon);
  const ribbon1920 = await ribbon.screenshot({
    path: path.join(evidenceDirectory, 'ribbon-1920x1080-claro-100.png'),
  });
  await testInfo.attach('ribbon-1920x1080-claro-100', {
    body: ribbon1920,
    contentType: 'image/png',
  });

  const homeTab = ribbon.getByRole('tab', { name: 'Inicio' });
  await homeTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(ribbon.getByRole('tab', { name: 'Insertar' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await page.keyboard.press('ArrowLeft');
  await expect(homeTab).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('F6');
  await expect(
    page.locator('[data-writer-focus-surface="document"]')
  ).toBeFocused();
  await page.keyboard.press('Shift+F6');
  await expect(homeTab).toBeFocused();

  const boldCommand = ribbon.locator('[data-command-id="home.font.bold"]');
  await boldCommand.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    ribbon.locator('[data-command-id="home.font.italic"]')
  ).toBeFocused();
  await page.keyboard.press('Home');
  await expect(
    ribbon.locator('[data-command-id="home.clipboard.paste"]')
  ).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    ribbon.locator('[data-command-id="home.editing.select"]')
  ).toBeFocused();

  const spacingCommand = ribbon.locator(
    '[data-command-id="home.paragraph.spacing"]'
  );
  await spacingCommand.focus();
  await expect(spacingCommand).toBeFocused();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(ribbon.locator('.canvas-word-ribbon__keytip')).toHaveCount(0);
  const spacingMenu = page.getByRole('menu', { name: 'Interlineado' });
  await expect(spacingMenu).toBeVisible();
  await expect(spacingMenu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(spacingMenu.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(spacingMenu).toHaveCount(0);
  await expect(spacingCommand).toBeFocused();

  await page.keyboard.press('Alt');
  await expect(
    ribbon.locator('.canvas-word-ribbon__keytip', { hasText: 'O' })
  ).toBeVisible();
  await page.keyboard.press('O');
  await expect(
    ribbon.locator('.canvas-word-ribbon__keytip', { hasText: 'V' }).first()
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    ribbon.locator('.canvas-word-ribbon__keytip', { hasText: 'O' })
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ribbon.locator('.canvas-word-ribbon__keytip')).toHaveCount(0);

  await page.keyboard.press('Control+F1');
  await expect(ribbon.locator('.canvas-word-ribbon__panel')).toHaveCount(0);
  await page.keyboard.press('Control+F1');
  await expect(ribbon.locator('.canvas-word-ribbon__panel')).toBeVisible();

  const editorCanvas = page
    .locator('.task-document-editor__canvas .ce-page-container > canvas')
    .first();
  await expect(editorCanvas).toBeVisible();
  await editorCanvas.click({ position: { x: 120, y: 100 } });
  await ribbon.locator('[data-command-id="home.editing.select"]').click();
  await expect(
    ribbon.locator('[data-command-id="home.font.bold"]')
  ).toHaveAttribute('aria-pressed', 'mixed');
  await page.keyboard.press('Escape');
  await editorCanvas.click({ position: { x: 120, y: 100 } });
  const centerCommand = ribbon.locator(
    '[data-command-id="home.paragraph.alignCenter"]'
  );
  await centerCommand.click();
  await expect(centerCommand).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Control+z');
  await expect(centerCommand).not.toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Control+y');
  await expect(centerCommand).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('.task-document-editor__header')
    .getByRole('button', { name: 'Guardar', exact: true })
    .click();
  await expect.poll(() => savedPayload).not.toBeNull();
  expect(JSON.stringify(savedPayload?.contentJson)).toContain('center');

  await page.reload();
  await page
    .locator('.task-document-editor__canvas .ce-page-container > canvas')
    .first()
    .click({ position: { x: 120, y: 100 } });
  const reopenedRibbon = page.getByLabel('Cinta de opciones del documento');
  await expect(
    reopenedRibbon.locator('[data-command-id="home.paragraph.alignCenter"]')
  ).toHaveAttribute('aria-pressed', 'true');

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(ribbon).toHaveAttribute(
      'data-ribbon-density',
      /expanded|compact|condensed/
    );
    await assertRibbonGeometry(ribbon);
    const screenshotName = `ribbon-${viewport.width}x${viewport.height}-claro-100.png`;
    const screenshot = await ribbon.screenshot({
      path: path.join(evidenceDirectory, screenshotName),
    });
    await testInfo.attach(screenshotName, {
      body: screenshot,
      contentType: 'image/png',
    });
  }

  for (const reflow of [
    { width: 960, height: 768, equivalentZoom: 200 },
    { width: 480, height: 768, equivalentZoom: 400 },
  ]) {
    await page.setViewportSize(reflow);
    await assertRibbonGeometry(ribbon);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' });
  await expect(page.locator('[data-dhyrium-theme="dark"]')).toBeVisible();
  await assertRibbonGeometry(ribbon);
  await ribbon.screenshot({
    path: path.join(evidenceDirectory, 'ribbon-1440x900-oscuro-100.png'),
  });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await expect(
    page.locator('[data-dhyrium-theme="high-contrast"]')
  ).toBeVisible();
  await assertRibbonGeometry(ribbon);
  await ribbon.screenshot({
    path: path.join(
      evidenceDirectory,
      'ribbon-1440x900-alto-contraste-100.png'
    ),
  });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotionDuration = await ribbon
    .getByRole('tab', { name: 'Inicio' })
    .evaluate(
      element =>
        Number.parseFloat(getComputedStyle(element).transitionDuration) || 0
    );
  expect(reducedMotionDuration).toBeLessThanOrEqual(0.001);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const metadata = JSON.stringify(
    {
      productReference: 'Word para Microsoft 365',
      channel: 'Current Channel',
      referenceVersion: '2606',
      referenceBuild: '20131.20154',
      operatingSystem: 'Windows 11 24H2 build 26100.8875',
      locale: 'es-PE',
      dpi: 96,
      browserZoom: '100%',
      theme: 'claro',
      ribbonMode: 'completa con adaptación automática',
      viewports: ['1920x1080', '1440x900', '1366x768', '1024x768 táctil'],
      reflowEquivalents: ['960x768 (200%)', '480x768 (400%)'],
    },
    null,
    2
  );
  await writeFile(
    path.join(evidenceDirectory, 'metadata.json'),
    metadata,
    'utf8'
  );
  await testInfo.attach('metadatos-visuales-hito-01', {
    body: Buffer.from(metadata),
    contentType: 'application/json',
  });
  expect(runtimeErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(unexpectedResponses).toEqual([]);
});

test('Hito 01 legado: la cinta es utilizable al tacto y sus menús permanecen dentro del viewport', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const evidenceDirectory = path.join(
    process.cwd(),
    '.agent-local',
    'evidence',
    'hito-01'
  );
  const context = await browser.newContext({
    colorScheme: 'light',
    hasTouch: true,
    isMobile: false,
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  const consoleErrors: string[] = [];
  const unexpectedResponses: string[] = [];
  page.on('pageerror', error =>
    runtimeErrors.push(error.stack ?? error.message)
  );
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400)
      unexpectedResponses.push(`${response.status()} ${response.url()}`);
  });

  const token = await login();
  await page.route(
    `**/api/v1/task-documents/subtasks/${TASK_ID}`,
    async route => {
      if (route.request().method() !== 'GET') return route.continue();
      await route.fulfill({
        status: 200,
        json: {
          document: {
            id: 'writer-hito-01-touch',
            taskKind: 'subtasks',
            taskId: TASK_ID,
            title: '02.02.02D.BLOQUE B.docx',
            contentJson: {
              type: 'canvas-editor',
              schemaVersion: 1,
              editorVersion: '1.0.0',
              data: { main: [{ value: 'Documento táctil del Hito 01\n' }] },
            },
            contentHtml: '<p>Documento táctil del Hito 01</p>',
            plainText: 'Documento táctil del Hito 01',
            revision: 1,
            versionNumber: 1,
            updatedAt: new Date().toISOString(),
            updatedBy: { id: 73, name: 'Usuario local' },
          },
        },
      });
    }
  );
  await page.addInitScript(value => {
    localStorage.setItem('token', value);
    localStorage.setItem(
      'budget-task-vertical-layout:selected-panels-v2',
      JSON.stringify([3])
    );
  }, token);

  await page.goto(TASK_URL);
  const ribbon = page.getByLabel('Cinta de opciones del documento');
  await expect(ribbon).toBeVisible();
  expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(
    0
  );
  await assertRibbonGeometry(ribbon);

  const targetSizes = await ribbon
    .locator('button, input, select, [role="button"]')
    .evaluateAll(controls =>
      controls
        .map(control => {
          const element = control as HTMLElement;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            display: style.display,
            height: rect.height,
            visibility: style.visibility,
            width: rect.width,
          };
        })
        .filter(
          item =>
            item.display !== 'none' &&
            item.visibility !== 'hidden' &&
            item.width > 0 &&
            item.height > 0
        )
    );
  expect(targetSizes.length).toBeGreaterThan(0);
  expect(
    Math.min(...targetSizes.map(item => item.width))
  ).toBeGreaterThanOrEqual(24);
  expect(
    Math.min(...targetSizes.map(item => item.height))
  ).toBeGreaterThanOrEqual(24);

  const collapsedGroup = ribbon
    .locator(
      '.canvas-word-ribbon__group.is-collapsed .canvas-word-ribbon__popover-trigger'
    )
    .first();
  await expect(collapsedGroup).toBeVisible();
  await collapsedGroup.tap();
  const menu = page.locator('.canvas-word-ribbon__popover[role="menu"]');
  await expect(menu).toBeVisible();
  const menuGeometry = await menu.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    };
  });
  expect(menuGeometry.left).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.top).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.right).toBeLessThanOrEqual(1024);
  expect(menuGeometry.bottom).toBeLessThanOrEqual(768);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  const screenshotName = 'ribbon-1024x768-tactil-100.png';
  const screenshot = await ribbon.screenshot({
    path: path.join(evidenceDirectory, screenshotName),
  });
  await testInfo.attach(screenshotName, {
    body: screenshot,
    contentType: 'image/png',
  });
  expect(runtimeErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(unexpectedResponses).toEqual([]);
  await context.close();
});
