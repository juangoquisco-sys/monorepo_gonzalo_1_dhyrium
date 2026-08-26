import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceFineForStatus,
  AttendanceReconciliationPolicy,
  RECONCILABLE_ATTENDANCE_STATUSES,
} from '@/services/attendanceControl/domain/attendanceReconciliationPolicy';

test.describe('AttendanceReconciliationPolicy', () => {
  test('allows only configured reconciliable statuses', () => {
    RECONCILABLE_ATTENDANCE_STATUSES.forEach(status => {
      assert.doesNotThrow(() =>
        AttendanceReconciliationPolicy.assertReconciliableStatus(status)
      );
    });

    assert.throws(
      () => AttendanceReconciliationPolicy.assertReconciliableStatus('PUNTUAL'),
      /no se puede reconciliar/
    );
    assert.throws(
      () => AttendanceReconciliationPolicy.assertReconciliableStatus('PERMISO'),
      /no se puede reconciliar/
    );
    assert.throws(
      () => AttendanceReconciliationPolicy.assertReconciliableStatus('SALIDA'),
      /no se puede reconciliar/
    );
  });

  test('requires reason and selected items', () => {
    assert.throws(
      () => AttendanceReconciliationPolicy.assertReason(''),
      /justificacion/
    );
    assert.throws(
      () => AttendanceReconciliationPolicy.assertItems([]),
      /Seleccione/
    );
    assert.doesNotThrow(() =>
      AttendanceReconciliationPolicy.assertReason('Falta justificada')
    );
    assert.doesNotThrow(() =>
      AttendanceReconciliationPolicy.assertItems([{ usersId: 1, listId: 2 }])
    );
  });

  test('calculates operational Lima date boundaries', () => {
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      '2026-05-25',
      '2026-05-25'
    );

    assert.equal(start.toISOString(), '2026-05-25T05:00:00.000Z');
    assert.equal(end.toISOString(), '2026-05-26T04:59:59.999Z');
  });

  test('resolves effective status from active reconciliation', () => {
    assert.equal(
      AttendanceReconciliationPolicy.effectiveStatus('GRAVE', 'PUNTUAL'),
      'PUNTUAL'
    );
    assert.equal(
      AttendanceReconciliationPolicy.effectiveStatus('GRAVE', null),
      'GRAVE'
    );
  });

  test('applies doubled attendance fines to management hierarchies', () => {
    assert.equal(attendanceFineForStatus('TARDE', 3), 0.5);
    assert.equal(attendanceFineForStatus('GRAVE', 3), 20);
    assert.equal(attendanceFineForStatus('TARDE', 2), 1);
    assert.equal(attendanceFineForStatus('GRAVE', 1), 40);
    assert.equal(attendanceFineForStatus('PUNTUAL', 1), 0);
    assert.equal(attendanceFineForStatus('GRAVE', null), 20);
  });

  test('parses incident status filters with problem statuses as default', () => {
    assert.deepEqual(
      AttendanceReconciliationPolicy.parseIncidentStatuses(),
      RECONCILABLE_ATTENDANCE_STATUSES
    );
    assert.deepEqual(
      AttendanceReconciliationPolicy.parseIncidentStatuses(['TARDE', 'SALIDA']),
      ['TARDE', 'SALIDA']
    );
    assert.throws(
      () =>
        AttendanceReconciliationPolicy.parseIncidentStatuses([
          'INVALIDO' as never,
        ]),
      /Estado de incidencia invalido/
    );
  });
});
