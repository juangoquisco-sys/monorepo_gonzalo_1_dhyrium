const SENSITIVE_BASE_PATHS = [
  '/users',
  '/user',
  '/roles',
  '/role',
  '/profile',
  '/auth',
  '/password',
  '/paymail',
  '/payrolls',
  '/payroll',
  '/contracts',
  '/contract',
];

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const SUCCESS_MUTATION_METHODS = ['POST', 'PUT', 'PATCH'];

const normalizePath = (path: string) => {
  const normalized = (path.split('?')[0] || '/').toLowerCase();
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

export const matchesSensitiveBasePath = (path: string) => {
  const normalizedPath = normalizePath(path);
  return SENSITIVE_BASE_PATHS.some(
    prefix =>
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
};

export const getAuditSeverity = (
  method: string,
  path: string,
  statusCode: number
) => {
  const upperMethod = method.toUpperCase();
  const isMutation = MUTATION_METHODS.includes(upperMethod);
  const isCriticalRoute = isMutation && matchesSensitiveBasePath(path);

  if (upperMethod === 'DELETE' || isCriticalRoute) return 'CRITICAL';
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'WARNING';
  if (SUCCESS_MUTATION_METHODS.includes(upperMethod) && statusCode < 300) {
    return 'SUCCESS';
  }
  return 'INFO';
};
