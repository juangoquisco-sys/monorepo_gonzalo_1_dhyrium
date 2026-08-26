import { OrganizationalUnitType } from '@prisma/client';

export type OfficialDirectoryKey =
  | 'general'
  | 'commercial-documentary-area'
  | 'commercial-documentary-desk'
  | 'commercial-contracts-accounting'
  | 'commercial-human-resources'
  | 'basic-information-administration-area'
  | 'basic-information-cabinet'
  | 'basic-information-field'
  | 'production-area'
  | 'production-preinvestment'
  | 'production-capi'
  | 'production-epa';

export type OfficialDirectoryUnit = {
  directoryKey: OfficialDirectoryKey;
  name: string;
  /**
   * Código que figura en el organigrama fuente. No es identificador único:
   * la fuente reutiliza dos códigos para unidades distintas.
   */
  displayCode: string;
  type: OrganizationalUnitType;
  parentDirectoryKey: OfficialDirectoryKey | null;
};

export type LegacyCanonicalMapping = {
  legacyCodemap: string;
  canonicalDirectoryKey: OfficialDirectoryKey;
};

/**
 * Equivalencia de nombres heredados que no tienen un codemap OFFICE/DIVISION.
 * Se compara con nombre normalizado y tipo para no inferir por texto parecido.
 */
export type LegacyCanonicalNameMapping = {
  legacyName: string;
  legacyType: OrganizationalUnitType;
  canonicalDirectoryKey: OfficialDirectoryKey;
};

/**
 * Directorio canónico transcrito del organigrama aprobado. `directoryKey` es
 * deliberadamente independiente de `displayCode`, pues el PPTX repite los
 * códigos 01.01.00.00.00 y 01.02.00.00.00 en niveles distintos.
 */
const PREVIOUS_ORGANIZATIONAL_DIRECTORY = [
  {
    directoryKey: 'general',
    name: 'Gerencia General',
    displayCode: '01.01.00.00.00',
    type: OrganizationalUnitType.GERENCIA,
    parentDirectoryKey: null,
  },
  {
    directoryKey: 'support-secretary',
    name: 'Secretaría General, Gestión Documentaria',
    displayCode: '01.02.00.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'support-legal',
    name: 'Asesoría Legal, Contractual',
    displayCode: '01.04.00.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'support-commercial',
    name: 'Comercial, Licitaciones y Contratos',
    displayCode: '01.03.00.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'support-digital',
    name: 'Tecnología y Transformación Digital',
    displayCode: '01.05.00.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'technical',
    name: 'Gerencia Técnica e Ingeniería',
    displayCode: '01.01.00.00.00',
    type: OrganizationalUnitType.GERENCIA,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'technical-project-coordination',
    name: 'Coordinación General de Proyectos',
    displayCode: '01.01.02.00.00',
    type: OrganizationalUnitType.COORDINACION,
    parentDirectoryKey: 'technical',
  },
  {
    directoryKey: 'technical-preinvestment',
    name: 'Oficina de Preinversión y Estudios Básicos',
    displayCode: '01.01.03.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'technical',
  },
  {
    directoryKey: 'technical-capi',
    name: 'Oficina de Estudios Definitivos CAPI',
    displayCode: '01.01.04.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'technical',
  },
  {
    directoryKey: 'technical-epa',
    name: 'Oficina de Estudios Definitivos EPA',
    displayCode: '01.01.05.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'technical',
  },
  {
    directoryKey: 'technical-laboratory',
    name: 'Oficina de Laboratorio y Campo',
    displayCode: '01.01.06.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'technical',
  },
  {
    directoryKey: 'technical-epa-architecture',
    name: 'Unidad de Arquitectura, Evacuación y Señalización',
    displayCode: '01.01.05.02.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-epa',
  },
  {
    directoryKey: 'technical-epa-costs',
    name: 'Unidad de Costos, Presupuesto y Programación',
    displayCode: '01.01.05.06.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-epa',
  },
  {
    directoryKey: 'technical-epa-structures',
    name: 'Unidad de Estructuras',
    displayCode: '01.01.05.03.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-epa',
  },
  {
    directoryKey: 'technical-epa-electrical',
    name: 'Unidad de Instalaciones Eléctricas, Electromecánicas, Comunicaciones y Gas',
    displayCode: '01.01.05.04.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-epa',
  },
  {
    directoryKey: 'technical-epa-sanitary',
    name: 'Unidad de Instalaciones Sanitarias',
    displayCode: '01.01.05.05.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-epa',
  },
  {
    directoryKey: 'technical-laboratory-soils',
    name: 'Unidad de Laboratorio de Suelos',
    displayCode: '01.01.06.02.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-laboratory',
  },
  {
    directoryKey: 'technical-laboratory-topography',
    name: 'Unidad de Topografía',
    displayCode: '01.01.06.01.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'technical-laboratory',
  },
  {
    directoryKey: 'administrative',
    name: 'Gerencia Administrativa',
    displayCode: '01.02.00.00.00',
    type: OrganizationalUnitType.GERENCIA,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'administrative-treasury',
    name: 'Oficina Administración, Cobranzas, Reportes, Tesorería',
    displayCode: '01.02.02.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'administrative',
  },
  {
    directoryKey: 'administrative-accounting',
    name: 'Oficina de Contabilidad y Tributación',
    displayCode: '01.02.04.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'administrative',
  },
  {
    directoryKey: 'administrative-human-resources',
    name: 'Oficina de Recursos Humanos y Bienestar',
    displayCode: '01.02.05.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'administrative',
  },
  {
    directoryKey: 'administrative-assets',
    name: 'Unidad de Patrimonio y Servicios Generales',
    displayCode: '01.02.03.00.00',
    type: OrganizationalUnitType.ESPECIALIDAD,
    parentDirectoryKey: 'administrative',
  },
] as const;

/**
 * Equivalencias conocidas del árbol heredado detectado en la base actual.
 * El auditor bloquea cualquier unidad heredada que no figure aquí: nunca se
 * debe inferir una migración por similitud de texto.
 */
/**
 * Estructura vigente transcrita del Anexo 02 de organizacion de linea para
 * una sola empresa. Los cargos de especialistas y asistentes son membresias;
 * este directorio solo contiene la Gerencia, las tres areas y las ocho
 * unidades del organigrama general. Especialistas y asistentes son cargos.
 */
export const OFFICIAL_ORGANIZATIONAL_DIRECTORY: readonly OfficialDirectoryUnit[] = [
  {
    directoryKey: 'general',
    name: 'Gerencia General',
    displayCode: 'M1',
    type: OrganizationalUnitType.GERENCIA,
    parentDirectoryKey: null,
  },
  {
    directoryKey: 'commercial-documentary-area',
    name: 'Área Comercial y Gestión Documentaria',
    displayCode: 'M2',
    type: OrganizationalUnitType.COORDINACION,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'commercial-documentary-desk',
    name: 'Mesa de Partes y Gestión Documentaria',
    displayCode: '2.2',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'commercial-documentary-area',
  },
  {
    directoryKey: 'commercial-contracts-accounting',
    name: 'Comercial, Contratos y Contabilidad',
    displayCode: '2.3',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'commercial-documentary-area',
  },
  {
    directoryKey: 'commercial-human-resources',
    name: 'Recursos Humanos y Bienestar',
    displayCode: '2.4',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'commercial-documentary-area',
  },
  {
    directoryKey: 'basic-information-administration-area',
    name: 'Área de Información Básica y Administración',
    displayCode: 'M3',
    type: OrganizationalUnitType.COORDINACION,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'basic-information-cabinet',
    name: 'Administración y Procesamiento de Gabinete',
    displayCode: '3.2',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'basic-information-administration-area',
  },
  {
    directoryKey: 'basic-information-field',
    name: 'Gestión Documentaria ante Entidades y Campo',
    displayCode: '3.3',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'basic-information-administration-area',
  },
  {
    directoryKey: 'production-area',
    name: 'Área de Producción',
    displayCode: 'M4',
    type: OrganizationalUnitType.COORDINACION,
    parentDirectoryKey: 'general',
  },
  {
    directoryKey: 'production-preinvestment',
    name: 'Preinversión y Estudios Básicos',
    displayCode: '4.2',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'production-area',
  },
  {
    directoryKey: 'production-capi',
    name: 'Estudios Definitivos — CAPI',
    displayCode: '4.3',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'production-area',
  },
  {
    directoryKey: 'production-epa',
    name: 'Estudios Definitivos — EPA',
    displayCode: '4.4',
    type: OrganizationalUnitType.OFICINA,
    parentDirectoryKey: 'production-area',
  },
] as const;

void PREVIOUS_ORGANIZATIONAL_DIRECTORY;

export const LEGACY_TO_CANONICAL_MAPPINGS: readonly LegacyCanonicalMapping[] = [
  { legacyCodemap: 'OFFICE:4', canonicalDirectoryKey: 'general' },
  {
    legacyCodemap: 'OFFICE:2',
    canonicalDirectoryKey: 'basic-information-administration-area',
  },
  { legacyCodemap: 'OFFICE:3', canonicalDirectoryKey: 'production-capi' },
  { legacyCodemap: 'OFFICE:6', canonicalDirectoryKey: 'production-epa' },
  { legacyCodemap: 'OFFICE:7', canonicalDirectoryKey: 'basic-information-field' },
  {
    legacyCodemap: 'DIVISION:6',
    canonicalDirectoryKey: 'production-preinvestment',
  },
] as const;

/**
 * Equivalencias textuales verificadas contra el árbol heredado actual. Son
 * solo una llave de lectura/migración: no modifican la unidad de origen.
 */
export const LEGACY_NAME_TO_CANONICAL_MAPPINGS: readonly LegacyCanonicalNameMapping[] = [
  {
    legacyName: 'Oficina de Asesoría Legal',
    legacyType: OrganizationalUnitType.OFICINA,
    canonicalDirectoryKey: 'commercial-documentary-desk',
  },
  {
    legacyName: 'Secretaría general',
    legacyType: OrganizationalUnitType.OFICINA,
    canonicalDirectoryKey: 'commercial-documentary-desk',
  },
  {
    legacyName: 'Oficina de Desarrollo Tecnológico',
    legacyType: OrganizationalUnitType.OFICINA,
    canonicalDirectoryKey: 'commercial-human-resources',
  },
] as const;

export type DirectoryValidationIssue = {
  code:
    | 'DUPLICATE_DIRECTORY_KEY'
    | 'UNKNOWN_PARENT_DIRECTORY_KEY'
    | 'CIRCULAR_PARENT_REFERENCE'
    | 'DUPLICATE_LEGACY_SOURCE'
    | 'UNKNOWN_LEGACY_TARGET'
    | 'DUPLICATE_LEGACY_NAME_SOURCE'
    | 'UNKNOWN_LEGACY_NAME_TARGET';
  message: string;
};

export type DatabaseOrganizationalUnitSnapshot = {
  id: string;
  name: string;
  codemap: string | null;
  type: OrganizationalUnitType;
  parentId: string | null;
  isActive: boolean;
  legacyMap: { legacyType: string; legacyId: number } | null;
  activeMembershipCount: number;
};

type CanonicalUnitAudit = {
  directoryKey: OfficialDirectoryKey;
  expectedName: string;
  displayCode: string;
  matchingUnitIds: string[];
  status: 'READY' | 'MISSING' | 'AMBIGUOUS';
};

export type OfficialDirectoryResolutionItem = {
  /** Definición y jerarquía que debe mostrar la vista canónica. */
  definition: OfficialDirectoryUnit;
  /** Identificador del registro físico cuando existe una equivalencia inequívoca. */
  unitId: string | null;
  /** Candidatos no heredados encontrados para facilitar una auditoría legible. */
  matchingUnitIds: string[];
  status: 'READY' | 'MISSING' | 'AMBIGUOUS';
};

export type OfficialDirectoryResolution = {
  /** Siempre contiene las 23 definiciones oficiales, en su orden canónico. */
  units: OfficialDirectoryResolutionItem[];
  /** Bloqueos del catálogo canónico; no incluye migraciones heredadas. */
  blockers: string[];
};

type LegacyMappingAudit = LegacyCanonicalMapping & {
  sourceUnitIds: string[];
  sourceMembershipCount: number;
  canonicalUnitIds: string[];
  status: 'READY' | 'SOURCE_MISSING' | 'CANONICAL_MISSING' | 'AMBIGUOUS';
};

type LegacyNameMappingAudit = LegacyCanonicalNameMapping & {
  sourceUnitIds: string[];
  sourceMembershipCount: number;
  canonicalUnitIds: string[];
  status: 'READY' | 'SOURCE_MISSING' | 'CANONICAL_MISSING' | 'AMBIGUOUS';
};

export type OrganizationalDirectoryAuditReport = {
  definitionIssues: DirectoryValidationIssue[];
  /**
   * Advertencias de la fuente aprobada. No bloquean la auditoría porque el
   * identificador estable de la unidad es `directoryKey`, no el código visible.
   */
  sourceCodeConflicts: Array<{
    code: 'SOURCE_CODE_NOT_UNIQUE';
    displayCode: string;
    directoryKeys: OfficialDirectoryKey[];
    message: string;
  }>;
  expectedDisplayCodeDuplicates: Array<{
    displayCode: string;
    directoryKeys: OfficialDirectoryKey[];
  }>;
  database: {
    activeUnitCount: number;
    activeMembershipCount: number;
    codemapCollisions: Array<{ codemap: string; unitIds: string[] }>;
    legacyUnitsWithoutExplicitMapping: Array<{
      id: string;
      name: string;
      codemap: string | null;
      activeMembershipCount: number;
    }>;
  };
  canonicalUnits: CanonicalUnitAudit[];
  legacyMappings: LegacyMappingAudit[];
  legacyNameMappings: LegacyNameMappingAudit[];
  blockers: string[];
};

export const normalizeOrganizationalName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-PE');

function legacyNameMappingKey(name: string, type: OrganizationalUnitType) {
  return `${normalizeOrganizationalName(name)}:${type}`;
}

/**
 * Busca una equivalencia heredada exacta sin cambiar registros. El codemap
 * prevalece cuando existe; si no, se usa nombre normalizado y tipo.
 */
export function resolveLegacyCanonicalDirectoryKey(
  unit: Pick<DatabaseOrganizationalUnitSnapshot, 'name' | 'codemap' | 'type'>,
  codemapMappings: readonly LegacyCanonicalMapping[] = LEGACY_TO_CANONICAL_MAPPINGS,
  nameMappings: readonly LegacyCanonicalNameMapping[] = LEGACY_NAME_TO_CANONICAL_MAPPINGS
): OfficialDirectoryKey | null {
  const codemapMatch = unit.codemap
    ? codemapMappings.find(mapping => mapping.legacyCodemap === unit.codemap)
    : undefined;
  if (codemapMatch) return codemapMatch.canonicalDirectoryKey;

  const nameKey = legacyNameMappingKey(unit.name, unit.type);
  return (
    nameMappings.find(
      mapping => legacyNameMappingKey(mapping.legacyName, mapping.legacyType) === nameKey
    )?.canonicalDirectoryKey ?? null
  );
}

function isLegacyUnit(
  unit: DatabaseOrganizationalUnitSnapshot,
  nameMappings: readonly LegacyCanonicalNameMapping[] = LEGACY_NAME_TO_CANONICAL_MAPPINGS
) {
  return (
    unit.legacyMap !== null ||
    (unit.codemap !== null && /^(OFFICE|DIVISION):\d+$/i.test(unit.codemap)) ||
    resolveLegacyCanonicalDirectoryKey(unit, [], nameMappings) !== null
  );
}

/**
 * Resuelve el directorio oficial contra una instantánea de unidades sin
 * modificar datos. Una unidad heredada nunca puede convertirse en la unidad
 * canónica, aunque tenga el mismo nombre o tipo: sus equivalencias se tratan
 * por separado durante una migración explícita.
 *
 * La jerarquía de la vista se obtiene de `definition.parentDirectoryKey`, no
 * de `parentId`, para no exponer un segundo árbol activo por error.
 */
export function resolveOfficialOrganizationalDirectory(
  units: readonly DatabaseOrganizationalUnitSnapshot[],
  directory: readonly OfficialDirectoryUnit[] = OFFICIAL_ORGANIZATIONAL_DIRECTORY,
  legacyNameMappings: readonly LegacyCanonicalNameMapping[] = LEGACY_NAME_TO_CANONICAL_MAPPINGS
): OfficialDirectoryResolution {
  const definitionIssues = validateOfficialOrganizationalDirectory(directory, [], []);
  const canonicalCandidatesByNameAndType = new Map<
    string,
    DatabaseOrganizationalUnitSnapshot[]
  >();

  units
    .filter(unit => unit.isActive && !isLegacyUnit(unit, legacyNameMappings))
    .forEach(unit => {
      const nameKey = `${normalizeOrganizationalName(unit.name)}:${unit.type}`;
      const candidates = canonicalCandidatesByNameAndType.get(nameKey) ?? [];
      candidates.push(unit);
      canonicalCandidatesByNameAndType.set(nameKey, candidates);
    });

  const resolvedUnits = directory.map(definition => {
    const candidates =
      canonicalCandidatesByNameAndType.get(
        `${normalizeOrganizationalName(definition.name)}:${definition.type}`
      ) ?? [];
    const status: OfficialDirectoryResolutionItem['status'] =
      candidates.length === 1
        ? 'READY'
        : candidates.length === 0
        ? 'MISSING'
        : 'AMBIGUOUS';

    return {
      definition,
      unitId: status === 'READY' ? candidates[0].id : null,
      matchingUnitIds: candidates.map(candidate => candidate.id),
      status,
    };
  });

  return {
    units: resolvedUnits,
    blockers: [
      ...definitionIssues.map(issue => issue.message),
      ...resolvedUnits
        .filter(unit => unit.status !== 'READY')
        .map(
          unit =>
            `Unidad canónica ${unit.definition.directoryKey} ${
              unit.status === 'MISSING' ? 'no existe' : 'es ambigua'
            } en la base.`
        ),
    ],
  };
}

export function validateOfficialOrganizationalDirectory(
  directory: readonly OfficialDirectoryUnit[] = OFFICIAL_ORGANIZATIONAL_DIRECTORY,
  mappings: readonly LegacyCanonicalMapping[] = LEGACY_TO_CANONICAL_MAPPINGS,
  nameMappings: readonly LegacyCanonicalNameMapping[] = LEGACY_NAME_TO_CANONICAL_MAPPINGS
): DirectoryValidationIssue[] {
  const issues: DirectoryValidationIssue[] = [];
  const keys = new Set<OfficialDirectoryKey>();
  const mappingsByLegacyCode = new Set<string>();
  const mappingsByLegacyName = new Set<string>();

  directory.forEach(unit => {
    if (keys.has(unit.directoryKey)) {
      issues.push({
        code: 'DUPLICATE_DIRECTORY_KEY',
        message: `La clave canónica ${unit.directoryKey} está repetida.`,
      });
    }
    keys.add(unit.directoryKey);
  });

  directory.forEach(unit => {
    if (unit.parentDirectoryKey && !keys.has(unit.parentDirectoryKey)) {
      issues.push({
        code: 'UNKNOWN_PARENT_DIRECTORY_KEY',
        message: `La unidad ${unit.directoryKey} referencia un padre inexistente: ${unit.parentDirectoryKey}.`,
      });
    }
    const visited = new Set<OfficialDirectoryKey>([unit.directoryKey]);
    let current = unit;
    while (current.parentDirectoryKey) {
      if (visited.has(current.parentDirectoryKey)) {
        issues.push({
          code: 'CIRCULAR_PARENT_REFERENCE',
          message: `La unidad ${unit.directoryKey} contiene una relación jerárquica circular.`,
        });
        break;
      }
      visited.add(current.parentDirectoryKey);
      const parent = directory.find(
        candidate => candidate.directoryKey === current.parentDirectoryKey
      );
      if (!parent) break;
      current = parent;
    }
  });

  mappings.forEach(mapping => {
    if (mappingsByLegacyCode.has(mapping.legacyCodemap)) {
      issues.push({
        code: 'DUPLICATE_LEGACY_SOURCE',
        message: `El origen heredado ${mapping.legacyCodemap} tiene más de un destino.`,
      });
    }
    mappingsByLegacyCode.add(mapping.legacyCodemap);
    if (!keys.has(mapping.canonicalDirectoryKey)) {
      issues.push({
        code: 'UNKNOWN_LEGACY_TARGET',
        message: `El origen heredado ${mapping.legacyCodemap} apunta a una unidad canónica inexistente.`,
      });
    }
  });

  nameMappings.forEach(mapping => {
    const sourceKey = legacyNameMappingKey(mapping.legacyName, mapping.legacyType);
    if (mappingsByLegacyName.has(sourceKey)) {
      issues.push({
        code: 'DUPLICATE_LEGACY_NAME_SOURCE',
        message: `El origen heredado ${mapping.legacyName} (${mapping.legacyType}) tiene más de un destino.`,
      });
    }
    mappingsByLegacyName.add(sourceKey);
    if (!keys.has(mapping.canonicalDirectoryKey)) {
      issues.push({
        code: 'UNKNOWN_LEGACY_NAME_TARGET',
        message: `El origen heredado ${mapping.legacyName} (${mapping.legacyType}) apunta a una unidad canónica inexistente.`,
      });
    }
  });

  return issues;
}

export function auditOrganizationalDirectory(
  units: readonly DatabaseOrganizationalUnitSnapshot[],
  directory: readonly OfficialDirectoryUnit[] = OFFICIAL_ORGANIZATIONAL_DIRECTORY,
  mappings: readonly LegacyCanonicalMapping[] = LEGACY_TO_CANONICAL_MAPPINGS,
  nameMappings: readonly LegacyCanonicalNameMapping[] = LEGACY_NAME_TO_CANONICAL_MAPPINGS
): OrganizationalDirectoryAuditReport {
  const activeUnits = units.filter(unit => unit.isActive);
  const definitionIssues = validateOfficialOrganizationalDirectory(
    directory,
    mappings,
    nameMappings
  );
  const unitsByCode = new Map<string, DatabaseOrganizationalUnitSnapshot[]>();

  activeUnits.forEach(unit => {
    if (unit.codemap) {
      const sameCode = unitsByCode.get(unit.codemap) ?? [];
      sameCode.push(unit);
      unitsByCode.set(unit.codemap, sameCode);
    }
  });

  const canonicalResolution = resolveOfficialOrganizationalDirectory(
    units,
    directory,
    nameMappings
  );
  const canonicalUnits: CanonicalUnitAudit[] = canonicalResolution.units.map(unit => ({
    directoryKey: unit.definition.directoryKey,
    expectedName: unit.definition.name,
    displayCode: unit.definition.displayCode,
    matchingUnitIds: unit.matchingUnitIds,
    status: unit.status,
  }));

  const canonicalIdsByKey = new Map(
    canonicalUnits.map(unit => [unit.directoryKey, unit.matchingUnitIds])
  );
  const legacyMappings: LegacyMappingAudit[] = mappings.map(mapping => {
    const sourceUnits = activeUnits.filter(
      unit => isLegacyUnit(unit, nameMappings) && unit.codemap === mapping.legacyCodemap
    );
    const canonicalUnitIds =
      canonicalIdsByKey.get(mapping.canonicalDirectoryKey) ?? [];
    return {
      ...mapping,
      sourceUnitIds: sourceUnits.map(unit => unit.id),
      sourceMembershipCount: sourceUnits.reduce(
        (total, unit) => total + unit.activeMembershipCount,
        0
      ),
      canonicalUnitIds,
      status:
        sourceUnits.length === 0
          ? 'SOURCE_MISSING'
          : canonicalUnitIds.length === 0
          ? 'CANONICAL_MISSING'
          : sourceUnits.length === 1 && canonicalUnitIds.length === 1
          ? 'READY'
      : 'AMBIGUOUS',
    };
  });

  const legacyNameMappings: LegacyNameMappingAudit[] = nameMappings.map(mapping => {
    const sourceKey = legacyNameMappingKey(mapping.legacyName, mapping.legacyType);
    const sourceUnits = activeUnits.filter(
      unit =>
        isLegacyUnit(unit, nameMappings) &&
        legacyNameMappingKey(unit.name, unit.type) === sourceKey
    );
    const canonicalUnitIds =
      canonicalIdsByKey.get(mapping.canonicalDirectoryKey) ?? [];
    return {
      ...mapping,
      sourceUnitIds: sourceUnits.map(unit => unit.id),
      sourceMembershipCount: sourceUnits.reduce(
        (total, unit) => total + unit.activeMembershipCount,
        0
      ),
      canonicalUnitIds,
      status:
        sourceUnits.length === 0
          ? 'SOURCE_MISSING'
          : canonicalUnitIds.length === 0
          ? 'CANONICAL_MISSING'
          : sourceUnits.length === 1 && canonicalUnitIds.length === 1
          ? 'READY'
          : 'AMBIGUOUS',
    };
  });

  const legacyUnitsWithoutExplicitMapping = activeUnits
    .filter(
      unit =>
        isLegacyUnit(unit, nameMappings) &&
        resolveLegacyCanonicalDirectoryKey(unit, mappings, nameMappings) === null
    )
    .map(unit => ({
      id: unit.id,
      name: unit.name,
      codemap: unit.codemap,
      activeMembershipCount: unit.activeMembershipCount,
    }));

  const expectedDisplayCodeDuplicates = [...new Set(directory.map(unit => unit.displayCode))]
    .map(displayCode => ({
      displayCode,
      directoryKeys: directory
        .filter(unit => unit.displayCode === displayCode)
        .map(unit => unit.directoryKey),
    }))
    .filter(duplicate => duplicate.directoryKeys.length > 1);
  const sourceCodeConflicts = expectedDisplayCodeDuplicates.map(conflict => ({
    code: 'SOURCE_CODE_NOT_UNIQUE' as const,
    displayCode: conflict.displayCode,
    directoryKeys: conflict.directoryKeys,
    message: `El organigrama fuente reutiliza el código ${conflict.displayCode}. Se conservará como código visible y se usará directoryKey como identificador único.`,
  }));
  const codemapCollisions = [...unitsByCode.entries()]
    .filter(([, sameCode]) => sameCode.length > 1)
    .map(([codemap, sameCode]) => ({
      codemap,
      unitIds: sameCode.map(unit => unit.id),
    }));

  const blockers = [
    ...definitionIssues.map(issue => issue.message),
    ...canonicalUnits
      .filter(unit => unit.status !== 'READY')
      .map(
        unit =>
          `Unidad canónica ${unit.directoryKey} ${
            unit.status === 'MISSING' ? 'no existe' : 'es ambigua'
          } en la base.`
      ),
    ...legacyMappings
      .filter(mapping => mapping.status !== 'READY')
      .map(
        mapping =>
          `Mapeo heredado ${mapping.legacyCodemap} no está listo: ${mapping.status}.`
      ),
    ...legacyNameMappings
      .filter(mapping => mapping.status !== 'READY')
      .map(
        mapping =>
          `Mapeo heredado ${mapping.legacyName} (${mapping.legacyType}) no está listo: ${mapping.status}.`
      ),
    ...legacyUnitsWithoutExplicitMapping.map(
      unit =>
        `Unidad heredada sin equivalencia explícita: ${unit.name} (${unit.codemap ?? 'sin código'}).`
    ),
  ];

  return {
    definitionIssues,
    sourceCodeConflicts,
    expectedDisplayCodeDuplicates,
    database: {
      activeUnitCount: activeUnits.length,
      activeMembershipCount: activeUnits.reduce(
        (total, unit) => total + unit.activeMembershipCount,
        0
      ),
      codemapCollisions,
      legacyUnitsWithoutExplicitMapping,
    },
    canonicalUnits,
    legacyMappings,
    legacyNameMappings,
    blockers,
  };
}
