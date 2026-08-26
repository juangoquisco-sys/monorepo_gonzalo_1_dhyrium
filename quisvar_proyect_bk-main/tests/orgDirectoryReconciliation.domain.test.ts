import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationalUnitType } from '@prisma/client';
import { OFFICIAL_ORGANIZATIONAL_DIRECTORY } from '../src/services/orgDirectory.domain';
import {
  buildOfficialDirectoryReconciliationPlan,
  type ReconciliationUnitSnapshot,
} from '../src/services/orgDirectoryReconciliation.domain';

function officialSnapshots(): ReconciliationUnitSnapshot[] {
  const idByKey = new Map(
    OFFICIAL_ORGANIZATIONAL_DIRECTORY.map(unit => [unit.directoryKey, `id-${unit.directoryKey}`])
  );
  return OFFICIAL_ORGANIZATIONAL_DIRECTORY.map(unit => ({
    id: idByKey.get(unit.directoryKey)!,
    name: unit.name,
    codemap: unit.displayCode,
    type: unit.type,
    parentId: unit.parentDirectoryKey ? idByKey.get(unit.parentDirectoryKey)! : null,
    isActive: true,
    legacyMap: null,
  }));
}

test('el plan es idempotente cuando las 12 unidades ya cumplen el catálogo', () => {
  const plan = buildOfficialDirectoryReconciliationPlan(officialSnapshots());
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.actions.length, 12);
  assert.ok(plan.actions.every(action => action.operation === 'UNCHANGED'));
});

test('crea solamente la unidad ausente y conserva los IDs existentes', () => {
  const snapshots = officialSnapshots().filter(
    unit => unit.id !== 'id-production-epa'
  );
  const plan = buildOfficialDirectoryReconciliationPlan(snapshots);
  const createActions = plan.actions.filter(action => action.operation === 'CREATE');

  assert.deepEqual(plan.blockers, []);
  assert.deepEqual(createActions.map(action => action.directoryKey), ['production-epa']);
  assert.equal(createActions[0].codemap, '4.4');
  assert.equal(createActions[0].type, OrganizationalUnitType.OFICINA);
  assert.equal(
    plan.actions.find(action => action.directoryKey === 'production-area')?.unitId,
    'id-production-area'
  );
});

test('normaliza la coordinación intentada desde la UI sin reemplazar su ID', () => {
  const snapshots = officialSnapshots().filter(
    unit => unit.id !== 'id-production-area'
  );
  snapshots.push({
    id: 'manual-coordination',
    name: 'Gerencia Técnica e Ingeniería',
    codemap: '01.01.00.00.00',
    type: OrganizationalUnitType.GERENCIA,
    parentId: 'id-general',
    isActive: true,
    legacyMap: null,
  });

  const action = buildOfficialDirectoryReconciliationPlan(snapshots).actions.find(
    item => item.directoryKey === 'production-area'
  );
  assert.equal(action?.operation, 'UPDATE');
  assert.equal(action?.unitId, 'manual-coordination');
  assert.deepEqual(action?.changes, ['name', 'codemap', 'type']);
});

test('convierte Patrimonio de oficina a especialidad conservando su ID', () => {
  const snapshots = officialSnapshots().filter(
    unit => unit.id !== 'id-commercial-human-resources'
  );
  snapshots.push({
    id: 'existing-assets',
    name: 'Unida de Recursos Humanos y Bienestar',
    codemap: '01.02.05.00.00',
    type: OrganizationalUnitType.OFICINA,
    parentId: 'id-commercial-documentary-area',
    isActive: true,
    legacyMap: null,
  });

  const action = buildOfficialDirectoryReconciliationPlan(snapshots).actions.find(
    item => item.directoryKey === 'commercial-human-resources'
  );
  assert.equal(action?.operation, 'UPDATE');
  assert.equal(action?.unitId, 'existing-assets');
  assert.deepEqual(action?.changes, ['name', 'codemap']);
});

test('bloquea candidatos ambiguos en vez de adivinar qué registro modificar', () => {
  const snapshots = officialSnapshots();
  snapshots.push({
    ...snapshots.find(unit => unit.id === 'id-production-area')!,
    id: 'duplicate-administrative',
  });
  const plan = buildOfficialDirectoryReconciliationPlan(snapshots);
  assert.ok(plan.blockers.some(blocker => blocker.includes('production-area')));
});
