import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allowsHistoricalTaskDocumentAssignment,
  hasProjectWriteRole,
  hasTaskDocumentAccess,
} from '../src/modules/task-documents/taskDocumentOffice.policy.domain';

const userWithProjectRole = (typeRol: 'MOD' | 'MEMBER' | 'VIEWER' | 'USER') =>
  ({
    role: {
      menuPoints: [
        {
          id: 3,
          title: 'Proyectos',
          route: 'especialidades',
          typeRol,
        },
      ],
    },
  } as Parameters<typeof hasProjectWriteRole>[0]);

test('solo el rol MOD del módulo Proyectos concede edición global', () => {
  assert.equal(hasProjectWriteRole(userWithProjectRole('MOD')), true);
  assert.equal(hasProjectWriteRole(userWithProjectRole('MEMBER')), false);
  assert.equal(hasProjectWriteRole(userWithProjectRole('VIEWER')), false);
});

test('el acceso documental requiere rol MOD global o asignaciÃ³n contextual', () => {
  assert.equal(hasTaskDocumentAccess(userWithProjectRole('MOD'), false), true);
  assert.equal(
    hasTaskDocumentAccess(userWithProjectRole('MEMBER'), true),
    true
  );
  assert.equal(
    hasTaskDocumentAccess(userWithProjectRole('VIEWER'), true),
    true
  );
  assert.equal(hasTaskDocumentAccess(userWithProjectRole('USER'), true), true);
  assert.equal(
    hasTaskDocumentAccess(userWithProjectRole('MEMBER'), false),
    false
  );
  assert.equal(
    hasTaskDocumentAccess(userWithProjectRole('VIEWER'), false),
    false
  );
});

test('una asignaciÃ³n histÃ³rica concede lectura pero nunca ediciÃ³n', () => {
  assert.equal(allowsHistoricalTaskDocumentAssignment('read'), true);
  assert.equal(allowsHistoricalTaskDocumentAssignment('edit'), false);
});
