const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(
  /\/+$/,
  ''
);

export const API_ORIGIN =
  configuredApiUrl ||
  (typeof window === 'undefined' ? '' : window.location.origin);

export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
