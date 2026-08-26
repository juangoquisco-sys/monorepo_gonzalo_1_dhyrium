import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { errorToken$, loader$ } from './sharingSubject';
import { addBreadcrumb, captureMessage } from '@/lib/frontendLogger';
import { reportConnectivityError } from './connectivity';
import { API_BASE_URL, API_ORIGIN } from '@/config/runtimeUrls';

export const URL = API_ORIGIN;
export { API_BASE_URL };

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

const PUBLIC_AUTH_ROUTES = ['/auth/login', '/auth/recovery'];

let requestsCount = 0;

const showLoader = (noLoader = false) => {
  if (!noLoader) {
    if (requestsCount === 0) {
      loader$.setSubject = true;
    }
    requestsCount++;
  }
};

const hideLoader = (noLoader = false) => {
  if (!noLoader) {
    requestsCount = Math.max(0, requestsCount - 1);
    if (requestsCount === 0) {
      loader$.setSubject = false;
    }
  }
};
const setAuthorizationHeader = (config: AxiosRequestConfig) => {
  const token: string | null = localStorage.getItem('token');
  const requestUrl = config.url || '';
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(route =>
    requestUrl.includes(route)
  );
  if (config.headers) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
    if (token && !isPublicAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
};

const shouldSkipFrontendApiLog = (url = '') =>
  url.includes('/system/frontend-logs');

const AUTH_ERROR_CODES = ['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'];
const FALLBACK_ERROR_MESSAGE = 'Ocurrió un error inesperado.';

const resolveApiErrorData = async (data: unknown) => {
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text());
    } catch {
      return {};
    }
  }

  return data;
};

const resolveApiErrorMessage = (data: unknown) => {
  if (data && typeof data === 'object' && 'message' in data) {
    const { message } = data as { message?: unknown };
    if (typeof message === 'string' && message.trim()) return message;
  }

  return FALLBACK_ERROR_MESSAGE;
};

const resolveApiErrorCode = (data: unknown) => {
  if (data && typeof data === 'object' && 'code' in data) {
    const { code } = data as { code?: unknown };
    if (typeof code === 'string') return code;
  }

  return undefined;
};

const trackApiError = (err: AxiosError) => {
  const { config, response, code, message } = err;
  const apiUrl = config?.url || '';
  if (shouldSkipFrontendApiLog(apiUrl)) return;

  const apiMethod = (config?.method || 'GET').toUpperCase();
  const statusCode = response?.status;
  const breadcrumbMessage = statusCode
    ? `${apiMethod} ${apiUrl} respondio ${statusCode}`
    : `${apiMethod} ${apiUrl} fallo sin respuesta`;

  addBreadcrumb({
    type: 'api_error',
    message: breadcrumbMessage,
    data: {
      apiMethod,
      apiUrl,
      statusCode,
      code,
    },
  });

  if (!statusCode || statusCode >= 500) {
    captureMessage({
      type: 'API_ERROR',
      level: statusCode && statusCode < 500 ? 'warning' : 'error',
      message: statusCode
        ? `Error API ${statusCode}: ${apiMethod} ${apiUrl}`
        : `Error de red: ${apiMethod} ${apiUrl}`,
      apiMethod,
      apiUrl,
      statusCode,
      context: {
        code,
        message,
      },
    });
  }
};

export const axiosInterceptor = () => {
  axiosInstance.interceptors.request.use(req => {
    showLoader(req.headers?.noLoader);
    setAuthorizationHeader(req);
    return req;
  });
  axiosInstance.interceptors.response.use(
    res => {
      hideLoader(res.config.headers?.noLoader);
      return res;
    },
    async err => {
      if (err instanceof AxiosError) {
        const { response, config } = err;
        hideLoader(config?.headers?.noLoader);
        if (!response) {
          if (err.code !== 'ERR_CANCELED') trackApiError(err);
          reportConnectivityError(err);
          return Promise.reject(err);
        }
        trackApiError(err);
        const errorData = await resolveApiErrorData(response.data);
        const errorCode = resolveApiErrorCode(errorData);
        if (
          (errorCode && AUTH_ERROR_CODES.includes(errorCode)) ||
          response.data?.error?.name === 'JsonWebTokenError'
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('arrChecked');
          errorToken$.setSubject = true;
          return;
        }
        const message = resolveApiErrorMessage(errorData);
        SnackbarUtilities.error(message);
        return Promise.reject(err);
      }
    }
  );
};
