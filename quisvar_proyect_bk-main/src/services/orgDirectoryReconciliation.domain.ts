import { OrganizationalUnitType } from '@prisma/client';
import {
  normalizeOrganizationalName,
  OFFICIAL_ORGANIZATIONAL_DIRECTORY,
  type OfficialDirectoryKey,
  type OfficialDirectoryUnit,
} from '@/services/orgDirectory.domain';

export type ReconciliationUnitSnapshot = {
  id: string;
  name: string;
  codemap: string | null;
  type: OrganizationalUnitType;
  parentId: string | null;
  isActive: boolean;
  legacyMap: { legacyType: string; legacyId: number } | null;
};

type KnownAlias = {
  name: string;
  types?: readonly OrganizationalUnitType[];
  codemaps?: readonly string[];
};

/**
 * Nombres que ya fueron usados por el catálogo canónico. Son equivalencias
 * cerradas: el reconciliador no usa similitud ni mueve unidades heredadas.
 */
const PREVIOUS_DIRECTORY_RECONCILIATION_ALIASES = {
  general: [{ name: 'Gerente General' }],
  technical: [{ name: 'Gerencia Técnica y Ingeniería' }],
  'technical-project-coordination': [
    {
      name: 'Coordinación General de Proyectos',
      types: [
        OrganizationalUnitType.COORDINACION,
        OrganizationalUnitType.OFICINA,
      ],
    },
    {
      name: 'COORDINACION',
      types: [OrganizationalUnitType.OFICINA],
      codemaps: ['01.01.20'],
    },
  ],
  'technical-preinvestment': [{ name: 'Oficina de Pre Inversión' }],
  'technical-capi': [{ name: 'Oficina Estudios Definitivos CAPI' }],
  administrative: [{ name: 'Gerente Administrativo' }],
  'administrative-human-resources': [
    { name: 'Unida de Recursos Humanos y Bienestar' },
    { name: 'Unidad de Recursos Humanos y Bienestar' },
  ],
  'administrative-assets': [
    {
      name: 'Patrimonio y Servicios Generales',
      types: [
        OrganizationalUnitType.OFICINA,
        OrganizationalUnitType.ESPECIALIDAD,
      ],
    },
    {
      name: 'Unidad de Patrimonio y Servicios Generales',
      types: [
        OrganizationalUnitType.OFICINA,
        OrganizationalUnitType.ESPECIALIDAD,
      ],
    },
  ],
};

export const OFFICIAL_DIRECTORY_RECONCILIATION_ALIASES: Partial<
  Record<OfficialDirectoryKey, readonly KnownAlias[]>
> = {
  general: [
    { name: 'Gerente' },
    { name: 'Gerente General' },
    { name: 'Gerencia General' },
  ],
  'commercial-documentary-desk': [
    { name: 'Secretaría General, Gestión Documentaria' },
  ],
  'commercial-contracts-accounting': [
    { name: 'Comercial, Licitaciones y Contratos' },
  ],
  'commercial-human-resources': [
    { name: 'Oficina de Recursos Humanos y Bienestar' },
    { name: 'Unida de Recursos Humanos y Bienestar' },
  ],
  'basic-information-administration-area': [
    { name: 'Gerencia Administrativa', types: [OrganizationalUnitType.GERENCIA] },
    { name: 'Gerente Administrativo', types: [OrganizationalUnitType.GERENCIA] },
  ],
  'basic-information-field': [
    { name: 'Oficina de Laboratorio y Campo' },
  ],
  'production-area': [
    { name: 'Gerencia Técnica e Ingeniería', types: [OrganizationalUnitType.GERENCIA] },
    { name: 'Gerencia Técnica y Ingeniería', types: [OrganizationalUnitType.GERENCIA] },
  ],
  'production-preinvestment': [
    { name: 'Oficina de Pre Inversión' },
  ],
  'production-capi': [
    { name: 'Oficina Estudios Definitivos CAPI' },
  ],
  'production-epa': [
    { name: 'Oficina de Estudios Definitivos EPA' },
  ],
};

void PREVIOUS_DIRECTORY_RECONCILIATION_ALIASES;

export type DirectoryReconciliationAction = {
  directoryKey: OfficialDirectoryKey;
  operation: 'CREATE' | 'UPDATE' | 'UNCHANGED';
  unitId: string | null;
  name: string;
  codemap: string;
  type: OrganizationalUnitType;
  parentDirectoryKey: OfficialDirectoryKey | null;
  changes: string[];
};

export type DirectoryReconciliationPlan = {
  actions: DirectoryReconciliationAction[];
  blockers: string[];
};

function isLegacy(unit: ReconciliationUnitSnapshot) {
  return (
    unit.legacyMap !== null ||
    (unit.codemap !== null && /^(OFFICE|DIVISION):\d+$/i.test(unit.codemap))
  );
}

function aliasMatches(
  unit: ReconciliationUnitSnapshot,
  definition: OfficialDirectoryUnit,
  alias: KnownAlias
) {
  if (normalizeOrganizationalName(unit.name) !== normalizeOrganizationalName(alias.name)) {
    return false;
  }
  const permittedTypes = alias.types ?? [definition.type];
  if (!permittedTypes.includes(unit.type)) return false;
  if (alias.codemaps && !alias.codemaps.includes(unit.codemap ?? '')) return false;
  return true;
}

function candidatesForDefinition(
  units: readonly ReconciliationUnitSnapshot[],
  definition: OfficialDirectoryUnit
) {
  const exactAlias: KnownAlias = {
    name: definition.name,
    types: [definition.type],
  };
  const aliases = [
    exactAlias,
    ...(OFFICIAL_DIRECTORY_RECONCILIATION_ALIASES[definition.directoryKey] ?? []),
  ];
  return units.filter(
    unit => !isLegacy(unit) && aliases.some(alias => aliasMatches(unit, definition, alias))
  );
}

export function buildOfficialDirectoryReconciliationPlan(
  units: readonly ReconciliationUnitSnapshot[],
  directory: readonly OfficialDirectoryUnit[] = OFFICIAL_ORGANIZATIONAL_DIRECTORY
): DirectoryReconciliationPlan {
  const matchesByKey = new Map<OfficialDirectoryKey, ReconciliationUnitSnapshot[]>();
  const blockers: string[] = [];

  directory.forEach(definition => {
    const candidates = candidatesForDefinition(units, definition);
    matchesByKey.set(definition.directoryKey, candidates);
    if (candidates.length > 1) {
      blockers.push(
        `La unidad ${definition.directoryKey} es ambigua: ${candidates
          .map(candidate => candidate.id)
          .join(', ')}.`
      );
    }
  });

  const keysByUnitId = new Map<string, OfficialDirectoryKey[]>();
  matchesByKey.forEach((candidates, directoryKey) => {
    if (candidates.length !== 1) return;
    const keys = keysByUnitId.get(candidates[0].id) ?? [];
    keys.push(directoryKey);
    keysByUnitId.set(candidates[0].id, keys);
  });
  keysByUnitId.forEach((directoryKeys, unitId) => {
    if (directoryKeys.length > 1) {
      blockers.push(
        `La unidad ${unitId} coincide con más de una definición: ${directoryKeys.join(
          ', '
        )}.`
      );
    }
  });

  const resolvedIdByKey = new Map<OfficialDirectoryKey, string>();
  matchesByKey.forEach((candidates, directoryKey) => {
    if (candidates.length === 1) resolvedIdByKey.set(directoryKey, candidates[0].id);
  });

  const actions = directory.map<DirectoryReconciliationAction>(definition => {
    const candidate = matchesByKey.get(definition.directoryKey)?.[0] ?? null;
    if (!candidate) {
      return {
        directoryKey: definition.directoryKey,
        operation: 'CREATE',
        unitId: null,
        name: definition.name,
        codemap: definition.displayCode,
        type: definition.type,
        parentDirectoryKey: definition.parentDirectoryKey,
        changes: ['crear registro canónico'],
      };
    }

    const expectedParentId = definition.parentDirectoryKey
      ? resolvedIdByKey.get(definition.parentDirectoryKey) ?? null
      : null;
    const changes: string[] = [];
    if (candidate.name !== definition.name) changes.push('name');
    if (candidate.codemap !== definition.displayCode) changes.push('codemap');
    if (candidate.type !== definition.type) changes.push('type');
    if (!candidate.isActive) changes.push('isActive');
    if (
      (!definition.parentDirectoryKey && candidate.parentId !== null) ||
      (definition.parentDirectoryKey &&
        expectedParentId !== null &&
        candidate.parentId !== expectedParentId)
    ) {
      changes.push('parentId');
    }

    return {
      directoryKey: definition.directoryKey,
      operation: changes.length ? 'UPDATE' : 'UNCHANGED',
      unitId: candidate.id,
      name: definition.name,
      codemap: definition.displayCode,
      type: definition.type,
      parentDirectoryKey: definition.parentDirectoryKey,
      changes,
    };
  });

  return { actions, blockers };
}
