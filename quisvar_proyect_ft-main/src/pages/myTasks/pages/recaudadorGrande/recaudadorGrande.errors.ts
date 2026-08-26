import axios from 'axios';

interface ApiErrorBody {
  message?: string;
  error?: string;
}

export const getRecaudadorGrandeErrorMessage = (
  error: unknown,
  fallback = 'No se pudo completar la operación.'
) => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  if (!error.response) {
    return 'No se pudo conectar con el backend local de Dhyrium.';
  }

  if (error.response.status === 401) {
    return 'La sesión expiró. Vuelva a iniciar sesión.';
  }

  if (error.response.status === 403) {
    return 'No tiene permisos para realizar esta operación.';
  }

  return error.response.data?.message || error.response.data?.error || fallback;
};
