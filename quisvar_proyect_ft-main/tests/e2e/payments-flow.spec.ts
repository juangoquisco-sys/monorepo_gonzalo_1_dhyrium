import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8083/api/v1';
const API_BASE_URL = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

const EMPLOYEE_DNI = process.env.E2E_PAYMENT_EMPLOYEE_DNI ?? '73520253';
const EMPLOYEE_PASSWORD =
  process.env.E2E_PAYMENT_EMPLOYEE_PASSWORD ?? 'sistemas';
const EMPLOYEE_USER_ID = Number(process.env.E2E_PAYMENT_EMPLOYEE_USER_ID ?? 2);
const EMPLOYEE_OFFICE_ID = Number(
  process.env.E2E_PAYMENT_EMPLOYEE_OFFICE_ID ?? 5
);

const MANAGER_DNI = process.env.E2E_PAYMENT_MANAGER_DNI ?? '71449908';
const MANAGER_PASSWORD = process.env.E2E_PAYMENT_MANAGER_PASSWORD ?? 'sistemas';
const GENERAL_MANAGEMENT_OFFICE_ID = Number(
  process.env.E2E_PAYMENT_GENERAL_OFFICE_ID ?? 4
);
const PAYMENT_COMPANY_NAME =
  process.env.E2E_PAYMENT_COMPANY_NAME ?? 'QUISVAR CYC S.R.L.';

const minimalPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
  'utf-8'
);

type LoginResult = {
  token: string;
  user?: {
    id: number;
    address?: string;
    ruc?: string;
    profile?: {
      dni?: string;
      firstName?: string;
      lastName?: string;
    };
  };
};

type ApiOptions = Parameters<APIRequestContext['fetch']>[1];

async function newApi(token?: string) {
  return playwrightRequest.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function apiFetch(
  api: APIRequestContext,
  url: string,
  options?: ApiOptions
) {
  const endpoint = url.replace(/^\/+/, '');
  const response = await api.fetch(endpoint, options);
  const text = await response.text();
  let body: unknown = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  expect(
    response.ok(),
    `${options?.method ?? 'GET'} ${endpoint}: ${text}`
  ).toBeTruthy();
  return body as any;
}

async function login(dni: string, password: string): Promise<LoginResult> {
  const api = await newApi();
  try {
    const body = await apiFetch(api, '/auth/login', {
      method: 'POST',
      data: { dni, password },
    });
    const token = body.token ?? body.user?.token;
    expect(
      token,
      `login response for ${dni} should include a token`
    ).toBeTruthy();
    return { token, user: body.user };
  } finally {
    await api.dispose();
  }
}

async function setBrowserToken(page: Page, token: string) {
  await page.addInitScript(
    value => localStorage.setItem('token', value),
    token
  );
  await page.goto(`${APP_URL}/#/home`);
}

async function createReport(
  api: APIRequestContext,
  userId: number,
  officeId: number,
  amount: number
) {
  const now = new Date();
  const initialDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const untilDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    15
  ).toISOString();

  return apiFetch(api, '/reports', {
    method: 'POST',
    data: {
      ids: [],
      totalPrice: amount,
      userId,
      untilDate,
      initialDate,
      percentage: 100,
      type: 'MENSUAL',
      officeId,
    },
  });
}

async function createPayMail(
  api: APIRequestContext,
  reportId: number,
  senderId: number,
  title: string,
  header: string
) {
  const data = {
    numberDocument: Number(title.match(/No\.(\d+)/)?.[1] ?? 1),
    type: 'INFORME',
    officeId: GENERAL_MANAGEMENT_OFFICE_ID,
    title,
    header,
    description: `<p>${header}</p>`,
    reports: [reportId],
    senderId,
    secondaryReceiver: [],
    signature: false,
  };

  return apiFetch(api, '/paymail', {
    method: 'POST',
    multipart: {
      data: JSON.stringify(data),
      mainProcedure: {
        name: `${title}.pdf`,
        mimeType: 'application/pdf',
        buffer: minimalPdf,
      },
    },
  });
}

async function getPayMail(api: APIRequestContext, id: number) {
  return apiFetch(api, `/paymail/${id}`);
}

async function createPayroll(api: APIRequestContext) {
  const pad = Number(
    process.env.E2E_PAYMENT_PAYROLL_PAD ?? 800_000 + (Date.now() % 100_000)
  );
  await apiFetch(api, '/payrolls', {
    method: 'POST',
    data: { pad },
  });

  const payrolls = await apiFetch(api, '/payrolls?status=true');
  const payroll = payrolls.find((item: any) => item.pad === pad) ?? payrolls[0];
  expect(payroll?.id, 'created payroll id').toBeTruthy();
  return payroll;
}

async function getPayroll(
  api: APIRequestContext,
  id: number,
  params: Record<string, string>
) {
  const searchParams = new URLSearchParams(params);
  return apiFetch(api, `/payrolls/${id}?${searchParams.toString()}`);
}

function findPayMailInPayroll(payroll: any, payMailId: number) {
  return payroll.offices
    .flatMap((office: any) => office.payMessages)
    .find((payMail: any) => payMail.id === payMailId);
}

async function findCompany(api: APIRequestContext) {
  const companies = await apiFetch(api, '/companies');
  const company =
    companies.find((item: any) => item.name === PAYMENT_COMPANY_NAME) ??
    companies.find((item: any) => item.name?.includes('QUISVAR')) ??
    companies[0];

  expect(company?.id, 'payment company id').toBeTruthy();
  return company;
}

test.describe('flujo de pagos', () => {
  test('crea, aprueba, agrega a planilla, genera documentos y finaliza el pago', async ({
    page,
  }) => {
    const runId = Date.now();
    const amount = 234.56;
    const reportHeader = `E2E flujo pagos ${runId}`;

    const employee = await login(EMPLOYEE_DNI, EMPLOYEE_PASSWORD);
    const manager = await login(MANAGER_DNI, MANAGER_PASSWORD);

    const employeeApi = await newApi(employee.token);
    const managerApi = await newApi(manager.token);

    try {
      const report = await createReport(
        employeeApi,
        EMPLOYEE_USER_ID,
        EMPLOYEE_OFFICE_ID,
        amount
      );
      expect(report.id).toBeTruthy();

      const title = `INFORME No.${
        runId % 10_000
      } E2E-DARC-${new Date().getFullYear()}`;
      const payMail = await createPayMail(
        employeeApi,
        report.id,
        EMPLOYEE_USER_ID,
        title,
        reportHeader
      );
      expect(payMail.id).toBeTruthy();

      const waitingPayMail = await getPayMail(managerApi, payMail.id);
      expect(waitingPayMail.onHolding).toBe(true);

      await setBrowserToken(page, manager.token);
      await page.goto(
        `${APP_URL}/#/tramites/tramite-de-pago?limit=50&page=0&type=RECEPTION&onHolding=true`
      );
      await expect(
        page.getByRole('link', { name: /Tr.mite de pagos/ })
      ).toBeVisible();

      await apiFetch(managerApi, '/payMail/holding', {
        method: 'PUT',
        data: { ids: [payMail.id] },
      });

      const received = await getPayMail(managerApi, payMail.id);
      expect(received.status).toBe('PROCESO');
      expect(received.onHolding).toBe(false);

      const officeInbox = await apiFetch(
        managerApi,
        `/payMail?type=RECEIVER&limit=50&page=0&officeId=${GENERAL_MANAGEMENT_OFFICE_ID}`
      );
      const officePayMail = officeInbox.mailList
        .map((item: any) => item.paymessage ?? item)
        .find((item: any) => item.id === payMail.id);
      expect(officePayMail?.status).toBe('PROCESO');

      await page.goto(
        `${APP_URL}/#/tramites/tramite-de-pago?type=RECEIVER&limit=50&page=0`
      );
      await expect(
        page.getByRole('button', { name: /Nuevo Tr.mite/ })
      ).toBeVisible();

      const payroll = await createPayroll(managerApi);
      await apiFetch(managerApi, `/payrolls/add-report/${payroll.id}`, {
        method: 'POST',
        data: { ids: [{ id: report.id }] },
      });

      const unapprovedPayroll = await getPayroll(managerApi, payroll.id, {
        isAuthorizedGrop: 'false',
      });
      const unapprovedPayMail = findPayMailInPayroll(
        unapprovedPayroll,
        payMail.id
      );
      expect(unapprovedPayMail?.header).toBe(reportHeader);
      expect(unapprovedPayMail?.reports.map((item: any) => item.id)).toContain(
        report.id
      );

      await page.goto(
        `${APP_URL}/#/tramites/tramite-de-pago/planilla/${payroll.id}?typePayroll=UNAPPROVED`
      );
      await expect(page.getByText(payroll.name).first()).toBeVisible();

      await apiFetch(managerApi, '/payrolls/step-authorized-items', {
        method: 'PUT',
        data: {
          isAuthorized: true,
          ids: [{ id: report.id }],
        },
      });

      await apiFetch(managerApi, '/payrolls/step-authorized-group', {
        method: 'PUT',
        data: {
          officeId: EMPLOYEE_OFFICE_ID,
          payrollId: payroll.id,
        },
      });

      const approvedPayroll = await getPayroll(managerApi, payroll.id, {
        isAuthorizedGrop: 'true',
        paymentGroup: 'false',
      });
      const approvedPayMail = findPayMailInPayroll(approvedPayroll, payMail.id);
      expect(approvedPayMail?.reports.map((item: any) => item.id)).toContain(
        report.id
      );

      await page.goto(
        `${APP_URL}/#/tramites/tramite-de-pago/planilla/${payroll.id}?typePayroll=APPROVED`
      );
      await expect(page.getByText(payroll.name).first()).toBeVisible();

      await apiFetch(managerApi, '/payrolls/step-payment', {
        method: 'PUT',
        data: { ids: [{ id: report.id }] },
      });

      await page.goto(
        `${APP_URL}/#/tramites/tramite-de-pago/planilla/${payroll.id}?typePayroll=UNPAID`
      );
      await expect(
        page.getByRole('row').filter({ hasText: reportHeader })
      ).toContainText('POR PAGAR');

      const company = await findCompany(managerApi);
      await apiFetch(managerApi, `/paymail/payment-pdf/${payMail.id}`, {
        method: 'PATCH',
        data: {
          paymentPdfData: JSON.stringify({
            ordenNumber: Number(company.orderQuantity ?? 1),
            company,
            payType: 'EFECTIVO',
            concept: reportHeader,
            amount: amount.toString(),
            title,
            ruc: employee.user?.ruc,
            address: employee.user?.address,
            dni: employee.user?.profile?.dni ?? EMPLOYEE_DNI,
            firstName: employee.user?.profile?.firstName,
            lastName: employee.user?.profile?.lastName,
          }),
          ordenNumber: Number(company.orderQuantity ?? 1),
          companyId: Number(company.id),
        },
      });

      const generatedDocuments = await getPayMail(managerApi, payMail.id);
      const paymentPdfData = JSON.parse(generatedDocuments.paymentPdfData);
      expect(paymentPdfData.concept).toBe(reportHeader);
      expect(paymentPdfData.dni).toBeTruthy();

      await apiFetch(managerApi, `/paymail/done/${payMail.id}`, {
        method: 'PATCH',
      });

      const finished = await getPayMail(managerApi, payMail.id);
      expect(finished.status).toBe('PAGADO');
      expect(finished.paymentPdfData).toBeTruthy();
    } finally {
      await employeeApi.dispose();
      await managerApi.dispose();
    }
  });
});
