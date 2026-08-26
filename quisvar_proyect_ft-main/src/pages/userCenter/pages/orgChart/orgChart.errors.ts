import axios from 'axios';

interface OrgChartApiErrorBody {
  message?: unknown;
  error?: unknown;
}

const publicMessageFromBody = (body: OrgChartApiErrorBody | undefined) => {
  if (typeof body?.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }

  if (typeof body?.error === 'string' && body.error.trim()) {
    return body.error.trim();
  }

  if (
    body?.error &&
    typeof body.error === 'object' &&
    'message' in body.error
  ) {
    const message = (body.error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  return undefined;
};

export const getOrgChartErrorMessage = (
  error: unknown,
  fallback = 'No se pudo guardar la unidad organizacional.'
) => {
  if (!axios.isAxiosError<OrgChartApiErrorBody>(error)) return fallback;

  if (!error.response) {
    return 'No se pudo conectar con el backend de Dhyrium. Verifique la conexión e inténtelo nuevamente.';
  }

  if (error.response.status === 401) {
    return 'La sesión expiró. Vuelva a iniciar sesión antes de guardar.';
  }

  if (error.response.status === 403) {
    return 'No tiene permisos para modificar el organigrama.';
  }

  return publicMessageFromBody(error.response.data) ?? fallback;
};
