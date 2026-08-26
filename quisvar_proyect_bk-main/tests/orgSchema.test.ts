import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationalUnitType } from '@prisma/client';
import {
  createOrganizationalUnitSchema,
  updateOrganizationalUnitSchema,
} from '../src/services/org.schema';

test('valida y normaliza una coordinación antes de crearla', () => {
  const parsed = createOrganizationalUnitSchema.parse({
    name: '  Coordinación General de Proyectos  ',
    codemap: '01.01.02.00.00',
    type: OrganizationalUnitType.COORDINACION,
    parentId: '00000000-0000-4000-8000-000000000001',
  });
  assert.equal(parsed.name, 'Coordinación General de Proyectos');
  assert.equal(parsed.type, OrganizationalUnitType.COORDINACION);
});

test('el PATCH admite atributos y padre juntos y rechaza un padre inválido', () => {
  const valid = updateOrganizationalUnitSchema.parse({
    name: 'Gerencia Técnica e Ingeniería',
    parentId: null,
  });
  assert.deepEqual(valid, {
    name: 'Gerencia Técnica e Ingeniería',
    parentId: null,
  });
  assert.equal(
    updateOrganizationalUnitSchema.safeParse({ parentId: 'technical' }).success,
    false
  );
});

