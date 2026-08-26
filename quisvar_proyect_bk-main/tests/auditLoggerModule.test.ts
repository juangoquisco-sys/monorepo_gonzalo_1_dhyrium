import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuditModule, getAuditModuleWhere } from '@/utils/auditModuleMapper';

test.describe('Audit logger module mapping', () => {
  test('maps frontend screen routes to audit modules', () => {
    const cases: Array<[string, string]> = [
      ['/auth/login', 'Autenticación'],
      ['/users', 'Centro de usuarios'],
      ['/profile/1', 'Centro de usuarios'],
      ['/role/form', 'Centro de usuarios'],
      ['/files/generalFiles', 'Centro de usuarios'],
      ['/mail/messages', 'Trámites'],
      ['/paymail/archived/list', 'Trámites'],
      ['/license', 'Trámites'],
      ['/payrolls', 'Trámites'],
      ['/generate-pdf/seal-message/1', 'Trámites'],
      ['/kitchen/orders', 'Cocina'],
      ['/projects', 'Especialidades'],
      ['/reports', 'Mis reportes'],
      ['/feedbacks/task/1', 'Especialidades'],
      ['/download/task/1', 'Especialidades'],
      ['/list/attendance', 'Control asistencia'],
      ['/attendance-control/incidents', 'Control asistencia'],
      ['/attendanceGroup/list/1', 'Control asistencia'],
      ['/duty-rotations', 'Rotaciones'],
      ['/asitec/1', 'Rotaciones'],
      ['/gate-control', 'Control puerta'],
      ['/companies', 'Empresas'],
      ['/consortium/1', 'Empresas'],
      ['/groups', 'Grupos'],
      ['/meeting-units/1/projects', 'Grupos'],
      ['/progress-reports/workspace', 'Grupos'],
      ['/contract/1', 'Índice general'],
      ['/folderVideos', 'Tutoriales'],
      ['/video/1', 'Tutoriales'],
      ['/metrados', 'Metrados'],
      ['/audit-logs/stats/summary', 'Auditoría'],
      ['/unknown', 'General'],
    ];

    for (const [path, module] of cases) {
      assert.equal(getAuditModule(path), module, path);
    }
  });

  test('builds path filters for derived module filters', () => {
    assert.deepEqual(getAuditModuleWhere(['Especialidades']), {
      OR: [
        { path: { equals: '/typespecialities', mode: 'insensitive' } },
        { path: { startsWith: '/typespecialities/', mode: 'insensitive' } },
        { path: { equals: '/trainingSpecialtyList', mode: 'insensitive' } },
        {
          path: { startsWith: '/trainingSpecialtyList/', mode: 'insensitive' },
        },
        { path: { equals: '/trainingSpecialty', mode: 'insensitive' } },
        { path: { startsWith: '/trainingSpecialty/', mode: 'insensitive' } },
        { path: { equals: '/areaSpecialtyList', mode: 'insensitive' } },
        { path: { startsWith: '/areaSpecialtyList/', mode: 'insensitive' } },
        { path: { equals: '/areaSpecialty', mode: 'insensitive' } },
        { path: { startsWith: '/areaSpecialty/', mode: 'insensitive' } },
        { path: { equals: '/operationaltasks', mode: 'insensitive' } },
        { path: { startsWith: '/operationaltasks/', mode: 'insensitive' } },
        { path: { equals: '/specialities', mode: 'insensitive' } },
        { path: { startsWith: '/specialities/', mode: 'insensitive' } },
        { path: { equals: '/basiclevels', mode: 'insensitive' } },
        { path: { startsWith: '/basiclevels/', mode: 'insensitive' } },
        { path: { equals: '/basictasks', mode: 'insensitive' } },
        { path: { startsWith: '/basictasks/', mode: 'insensitive' } },
        { path: { equals: '/feedbacks', mode: 'insensitive' } },
        { path: { startsWith: '/feedbacks/', mode: 'insensitive' } },
        { path: { equals: '/download', mode: 'insensitive' } },
        { path: { startsWith: '/download/', mode: 'insensitive' } },
        { path: { equals: '/projects', mode: 'insensitive' } },
        { path: { startsWith: '/projects/', mode: 'insensitive' } },
        { path: { equals: '/subtasks', mode: 'insensitive' } },
        { path: { startsWith: '/subtasks/', mode: 'insensitive' } },
        { path: { equals: '/stages', mode: 'insensitive' } },
        { path: { startsWith: '/stages/', mode: 'insensitive' } },
        { path: { equals: '/levels', mode: 'insensitive' } },
        { path: { startsWith: '/levels/', mode: 'insensitive' } },
        { path: { equals: '/sector', mode: 'insensitive' } },
        { path: { startsWith: '/sector/', mode: 'insensitive' } },
        { path: { equals: '/phases', mode: 'insensitive' } },
        { path: { startsWith: '/phases/', mode: 'insensitive' } },
      ],
    });
  });
});
