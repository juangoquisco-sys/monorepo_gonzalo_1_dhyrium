import { expect, request as playwrightRequest, test } from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';
const API_URL =
  process.env.E2E_API_URL ??
  process.env.VITE_API_URL ??
  'http://172.16.10.250:8084';
const API_WITH_ROUTE = API_URL.endsWith('/api/v1')
  ? API_URL
  : `${API_URL.replace(/\/$/, '')}/api/v1`;
const API_BASE_URL = API_WITH_ROUTE.endsWith('/')
  ? API_WITH_ROUTE
  : `${API_WITH_ROUTE}/`;

const CONTROLLER_DNI = process.env.E2E_GATE_CONTROLLER_DNI ?? '73520253';
const CONTROLLER_PASSWORD =
  process.env.E2E_GATE_CONTROLLER_PASSWORD ?? 'sistemas';
const SEARCH_TERM = process.env.E2E_GATE_SEARCH_TERM ?? 'carlo';

async function login() {
  const api = await playwrightRequest.newContext({ baseURL: API_BASE_URL });
  try {
    const response = await api.post('auth/login', {
      data: { dni: CONTROLLER_DNI, password: CONTROLLER_PASSWORD },
    });
    const text = await response.text();
    expect(response.ok(), `login failed: ${text}`).toBeTruthy();
    const body = JSON.parse(text);
    const token = body.token ?? body.user?.token;
    expect(token, 'login response should include token').toBeTruthy();
    return token as string;
  } finally {
    await api.dispose();
  }
}

test.describe('control de puerta - monitor', () => {
  test('keeps the default reason and supports keyboard user selection', async ({
    page,
  }) => {
    const token = await login();
    await page.addInitScript(
      value => localStorage.setItem('token', value),
      token
    );

    await page.goto(`${APP_URL}/#/control-puerta/monitor`);
    await expect(
      page.getByRole('heading', { name: /Monitor de puerta/i })
    ).toBeVisible();

    await expect(
      page.locator('.gateControl-monitorReasons button.is-selected')
    ).toContainText(/Ir a la tienda/i);

    const search = page.getByPlaceholder(/Buscar por DNI, Nombre o Email/i);
    await search.fill(SEARCH_TERM);
    await expect(
      page.locator('.gateControl-results button').first()
    ).toBeVisible();

    await search.press('ArrowDown');
    await expect(
      page.locator('.gateControl-results button.is-highlighted')
    ).toBeVisible();

    await search.press('Enter');
    await expect(page.locator('.gateControl-results')).toBeHidden();
    await expect(search).not.toHaveValue(SEARCH_TERM);
  });
});
