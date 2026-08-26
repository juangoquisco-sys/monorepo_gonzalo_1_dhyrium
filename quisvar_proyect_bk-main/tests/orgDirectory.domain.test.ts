import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationalUnitType } from '@prisma/client';
import {
  auditOrganizationalDirectory,
  type DatabaseOrganizationalUnitSnapshot,
  OFFICIAL_ORGANIZATIONAL_DIRECTORY,
  resolveLegacyCanonicalDirectoryKey,
  resolveOfficialOrganizationalDirectory,
  validateOfficialOrganizationalDirectory,
} from '../src/services/orgDirectory.domain';

test('el directorio oficial usa claves internas únicas aunque la fuente repita códigos visibles', () => {
  assert.deepEqual(validateOfficialOrganizationalDirectory(), []);
  assert.equal(OFFICIAL_ORGANIZATIONAL_DIRECTORY.length, 12);

  const report = auditOrganizationalDirectory([]);
  const duplicate = report.expectedDisplayCodeDuplicates.find(
    item => item.displayCode === '01.01.00.00.00'
  );
  const sourceConflict = report.sourceCodeConflicts.find(
    item => item.displayCode === '01.01.00.00.00'
  );

  assert.equal(duplicate, undefined);
  assert.equal(sourceConflict, undefined);

  assert.equal(
    OFFICIAL_ORGANIZATIONAL_DIRECTORY.find(
      unit => unit.directoryKey === 'commercial-human-resources'
    )?.name,
    'Recursos Humanos y Bienestar'
  );
  assert.deepEqual(
    OFFICIAL_ORGANIZATIONAL_DIRECTORY.slice(1, 5).map(unit => unit.directoryKey),
    [
      'commercial-documentary-area',
      'commercial-documentary-desk',
      'commercial-contracts-accounting',
      'commercial-human-resources',
    ]
  );
});

test('la resolución canónica excluye por completo candidatos del árbol heredado', () => {
  const snapshots: DatabaseOrganizationalUnitSnapshot[] = OFFICIAL_ORGANIZATIONAL_DIRECTORY.map((definition, index) => ({
    id: `canonical-${definition.directoryKey}`,
    name: definition.name,
    codemap: definition.displayCode,
    type: definition.type,
    parentId: index === 0 ? null : 'canonical-parent',
    isActive: true,
    legacyMap: null,
    activeMembershipCount: 0,
  }));
  snapshots.push({
    id: 'legacy-administrative',
      name: 'Gerencia Administrativa',
    codemap: 'OFFICE:2',
    type: OrganizationalUnitType.GERENCIA,
    parentId: null,
    isActive: true,
    legacyMap: { legacyType: 'OFFICE', legacyId: 2 },
    activeMembershipCount: 9,
  });

  const resolution = resolveOfficialOrganizationalDirectory(snapshots);
  const administrative = resolution.units.find(
    unit => unit.definition.directoryKey === 'basic-information-administration-area'
  );

  assert.equal(resolution.units.length, 12);
  assert.deepEqual(resolution.blockers, []);
  assert.deepEqual(administrative, {
    definition: OFFICIAL_ORGANIZATIONAL_DIRECTORY.find(
      unit => unit.directoryKey === 'basic-information-administration-area'
    ),
    unitId: 'canonical-basic-information-administration-area',
    matchingUnitIds: ['canonical-basic-information-administration-area'],
    status: 'READY',
  });

  const auditAdministrative = auditOrganizationalDirectory(snapshots).canonicalUnits.find(
    unit => unit.directoryKey === 'basic-information-administration-area'
  );
  assert.deepEqual(auditAdministrative?.matchingUnitIds, [
    'canonical-basic-information-administration-area',
  ]);
});

test('las equivalencias heredadas sin codemap usan nombre normalizado y tipo exacto', () => {
  const legacyLegal = {
    id: 'legacy-legal',
    name: '  oficina de asesoría legal ',
    codemap: null,
    type: OrganizationalUnitType.OFICINA,
    parentId: null,
    isActive: true,
    legacyMap: null,
    activeMembershipCount: 3,
  };
  const legacySecretary = {
    ...legacyLegal,
    id: 'legacy-secretary',
    name: 'SECRETARÍA GENERAL',
    activeMembershipCount: 2,
  };
  const legacyDigital = {
    ...legacyLegal,
    id: 'legacy-digital',
    name: 'Oficina de Desarrollo Tecnológico',
    activeMembershipCount: 1,
  };

  assert.equal(resolveLegacyCanonicalDirectoryKey(legacyLegal), 'commercial-documentary-desk');
  assert.equal(
    resolveLegacyCanonicalDirectoryKey(legacySecretary),
    'commercial-documentary-desk'
  );
  assert.equal(resolveLegacyCanonicalDirectoryKey(legacyDigital), 'commercial-human-resources');

  const report = auditOrganizationalDirectory([
    legacyLegal,
    legacySecretary,
    legacyDigital,
  ]);
  assert.deepEqual(
    report.legacyNameMappings.map(mapping => mapping.sourceUnitIds),
    [['legacy-legal'], ['legacy-secretary'], ['legacy-digital']]
  );
  assert.deepEqual(report.database.legacyUnitsWithoutExplicitMapping, []);
});

test('la auditoría solo considera listo un mapeo heredado cuando origen y destino son inequívocos', () => {
  const report = auditOrganizationalDirectory([
    {
      id: 'canonical-general',
      name: 'Gerencia General',
      codemap: 'M1',
      type: OrganizationalUnitType.GERENCIA,
      parentId: null,
      isActive: true,
      legacyMap: null,
      activeMembershipCount: 1,
    },
    {
      id: 'legacy-general',
      name: 'GERENCIA GENERAL',
      codemap: 'OFFICE:4',
      type: OrganizationalUnitType.GERENCIA,
      parentId: null,
      isActive: true,
      legacyMap: { legacyType: 'OFFICE', legacyId: 4 },
      activeMembershipCount: 3,
    },
  ]);

  const mapping = report.legacyMappings.find(
    item => item.legacyCodemap === 'OFFICE:4'
  );

  assert.equal(mapping?.status, 'READY');
  assert.equal(mapping?.sourceMembershipCount, 3);
  assert.ok(report.blockers.some(message => message.includes('commercial-documentary-area')));
});

test('la auditoría bloquea una unidad heredada sin equivalencia explícita', () => {
  const report = auditOrganizationalDirectory([
    {
      id: 'legacy-unknown',
      name: 'Oficina heredada no homologada',
      codemap: 'OFFICE:99',
      type: OrganizationalUnitType.OFICINA,
      parentId: null,
      isActive: true,
      legacyMap: { legacyType: 'OFFICE', legacyId: 99 },
      activeMembershipCount: 2,
    },
  ]);

  assert.deepEqual(report.database.legacyUnitsWithoutExplicitMapping, [
    {
      id: 'legacy-unknown',
      name: 'Oficina heredada no homologada',
      codemap: 'OFFICE:99',
      activeMembershipCount: 2,
    },
  ]);
  assert.ok(report.blockers.some(message => message.includes('OFFICE:99')));
});

test('el directorio general termina en las ocho unidades del organigrama', () => {
  assert.equal(
    OFFICIAL_ORGANIZATIONAL_DIRECTORY.filter(
      item => item.type === OrganizationalUnitType.OFICINA
    ).length,
    8
  );
  assert.equal(
    OFFICIAL_ORGANIZATIONAL_DIRECTORY.some(
      item => item.type === OrganizationalUnitType.ESPECIALIDAD
    ),
    false
  );
});
