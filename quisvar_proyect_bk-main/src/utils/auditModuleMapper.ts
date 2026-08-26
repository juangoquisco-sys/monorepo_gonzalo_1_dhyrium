import type { Prisma } from '@prisma/client';

export interface AuditModuleRoute {
  module: string;
  prefixes: string[];
}

export const AUDIT_MODULE_ROUTES: AuditModuleRoute[] = [
  { module: 'Auditoría', prefixes: ['/audit-logs'] },
  {
    module: 'Control asistencia',
    prefixes: [
      '/attendance-control',
      '/attendanceGroup',
      '/attendance',
      '/list',
    ],
  },
  {
    module: 'Rotaciones',
    prefixes: ['/duty-rotations', '/dutyMembers', '/duty', '/asitec'],
  },
  { module: 'Control puerta', prefixes: ['/gate-control'] },
  {
    module: 'Grupos',
    prefixes: [
      '/meeting-external-contacts',
      '/meeting-units',
      '/basic-resources',
      '/progress-reports',
      '/report-item-templates',
      '/report-index-templates',
      '/calendar-activities',
      '/meetings',
      '/commitments',
      '/calendar',
      '/division',
      '/office',
      '/groups',
    ],
  },
  {
    module: 'Especialidades',
    prefixes: [
      '/typespecialities',
      '/trainingSpecialtyList',
      '/trainingSpecialty',
      '/areaSpecialtyList',
      '/areaSpecialty',
      '/operationaltasks',
      '/specialities',
      '/basiclevels',
      '/basictasks',
      '/feedbacks',
      '/download',
      '/projects',
      '/subtasks',
      '/stages',
      '/levels',
      '/sector',
      '/phases',
    ],
  },
  {
    module: 'Trámites',
    prefixes: ['/generate-pdf', '/payrolls', '/paymail', '/license', '/mail'],
  },
  { module: 'Mis reportes', prefixes: ['/reports'] },
  { module: 'Índice general', prefixes: ['/contract'] },
  { module: 'Empresas', prefixes: ['/consortium', '/companies'] },
  { module: 'Tutoriales', prefixes: ['/folderVideos', '/video'] },
  { module: 'Metrados', prefixes: ['/metrados'] },
  { module: 'Cocina', prefixes: ['/kitchen', '/meal'] },
  {
    module: 'Centro de usuarios',
    prefixes: [
      '/specialists',
      '/workStation',
      '/profession',
      '/equipment',
      '/profile',
      '/users',
      '/files',
      '/role',
      '/org',
    ],
  },
  { module: 'Autenticación', prefixes: ['/auth'] },
];

const normalizePath = (path: string) => path.split('?')[0] || '/';

const matchesPrefix = (path: string, prefix: string) => {
  const normalizedPath = normalizePath(path).toLowerCase();
  const normalizedPrefix = prefix.toLowerCase();
  return (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  );
};

export const getAuditModule = (path: string) =>
  AUDIT_MODULE_ROUTES.find(route =>
    route.prefixes.some(prefix => matchesPrefix(path, prefix))
  )?.module || 'General';

export const getAuditModules = () => [
  ...AUDIT_MODULE_ROUTES.map(route => route.module),
  'General',
];

export const getAuditModulesMatchingSearch = (search: string) => {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return [];
  return getAuditModules().filter(module =>
    module.toLowerCase().includes(normalizedSearch)
  );
};

const prefixWhere = (prefix: string): Prisma.AuditLogWhereInput[] => [
  { path: { equals: prefix, mode: 'insensitive' } },
  { path: { startsWith: `${prefix}/`, mode: 'insensitive' } },
];

export const getAuditModuleWhere = (
  modules: string[]
): Prisma.AuditLogWhereInput | undefined => {
  if (!modules.length) return undefined;

  const moduleSet = new Set(modules);
  const prefixes = AUDIT_MODULE_ROUTES.filter(route =>
    moduleSet.has(route.module)
  ).flatMap(route => route.prefixes);

  const conditions = prefixes.flatMap(prefixWhere);
  if (moduleSet.has('General')) {
    const knownPathConditions = AUDIT_MODULE_ROUTES.flatMap(route =>
      route.prefixes.flatMap(prefixWhere)
    );
    conditions.push({ NOT: { OR: knownPathConditions } });
  }

  if (conditions.length) return { OR: conditions };
  return { path: { equals: '__audit_module_not_found__' } };
};
