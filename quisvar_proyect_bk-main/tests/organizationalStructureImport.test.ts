import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parentCode,
  parseOrganizationalTsv,
  roleForTitle,
  unitType,
} from '../src/scripts/importOrganizationalStructure';

test('analiza TSV organizacional y conserva las líneas de origen', () => {
  const rows = parseOrganizationalTsv(
    'N°\tCargo\tNombres\tDNI\n01.01.03.01.00\tCoordinador y/o Jefe\tPersona Uno\t12345678\nTOTAL\t\t\t'
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    line: 2,
    code: '01.01.03.01.00',
    title: 'Coordinador y/o Jefe',
    fullName: 'Persona Uno',
    dni: '12345678',
  });
});

test('resuelve padres y roles sin inferir cambios en el perfil', () => {
  assert.equal(parentCode('01.01.05.03.01'), '01.01.05.03.00');
  assert.equal(roleForTitle('Coordinador y/o Jefe de Oficina'), 'JEFE');
  assert.equal(roleForTitle('Asistente Administrativo'), 'ASISTENTE');
  assert.equal(unitType('Coordinacion General de Proyectos'), 'COORDINACION');
});
