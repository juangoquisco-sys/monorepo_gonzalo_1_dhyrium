import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AttendanceCaptureMode,
  AttendanceListState,
  AttendanceStatusSource,
  ListDetails,
} from '@prisma/client';
import { ATTENDANCE_SOCKET_EVENTS } from '../src/services/attendance/attendanceRealtime.service';
import { createAttendanceAuditEvent } from '../src/services/attendance/attendanceAudit.service';
import {
  attendanceListActionRequestSchema,
  createAttendanceRequestSchema,
  updateAttendanceBatchRequestSchema,
} from '../src/services/attendance/attendance.schema';
import {
  buildBiometricMarkUpdate,
  buildBiometricConfiguration,
  buildAttendanceParticipantRows,
  canCloseBiometricAttendance,
  canDiscardAttendanceList,
  canFinalizeAttendanceList,
  canUpdateAttendanceParticipant,
  evaluateBiometricEvent,
  evaluateBiometricParticipant,
  normalizeAttendanceBatchChanges,
  parseLimaDeviceTimestamp,
  isValidAttendanceActorId,
  planAttendanceBatchChanges,
  resolveAttendanceListLifecycle,
  resolveAdministrativeStatusSource,
} from '../src/services/attendance/attendance.policy';

test.describe('Attendance lifecycle policy', () => {
  const now = new Date('2026-07-23T14:00:00.000Z');

  test('opens manual creation as an editable pending list', () => {
    assert.deepEqual(
      resolveAttendanceListLifecycle(AttendanceCaptureMode.MANUAL, now),
      {
        captureMode: AttendanceCaptureMode.MANUAL,
        state: AttendanceListState.OPEN,
        openedAt: now,
      }
    );
  });

  test('opens biometric creation and preserves active license types', () => {
    assert.deepEqual(
      resolveAttendanceListLifecycle(AttendanceCaptureMode.BIOMETRIC, now),
      {
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.OPEN,
        openedAt: now,
      }
    );
    assert.deepEqual(
      buildAttendanceParticipantRows(
        8,
        [10, 20, 30, 40],
        [
          { usersId: 20, type: 'PERMISO' },
          { usersId: 30, type: 'SALIDA' },
        ]
      ),
      [
        {
          listId: 8,
          usersId: 10,
          status: ListDetails.SIMPLE,
          statusSource: AttendanceStatusSource.SYSTEM_DEFAULT,
        },
        {
          listId: 8,
          usersId: 20,
          status: ListDetails.PERMISO,
          statusSource: AttendanceStatusSource.LICENSE,
        },
        {
          listId: 8,
          usersId: 30,
          status: ListDetails.SALIDA,
          statusSource: AttendanceStatusSource.LICENSE,
        },
        {
          listId: 8,
          usersId: 40,
          status: ListDetails.SIMPLE,
          statusSource: AttendanceStatusSource.SYSTEM_DEFAULT,
        },
      ]
    );
  });

  test('accepts only explicitly configured fingerprint events in the open window', () => {
    const configuration = buildBiometricConfiguration({
      allowedSerials: 'ZK-01',
      fingerprintVerifyModes: '1,15',
      clockSkewSeconds: 30,
    });
    const result = evaluateBiometricEvent({
      serialNumber: 'ZK-01',
      verifyMode: '1',
      timestamp: '2026-07-23 09:00:00',
      openedAt: new Date('2026-07-23T13:59:00.000Z'),
      now,
      configuration,
    });

    assert.equal(result.accepted, true);
    if (result.accepted) {
      assert.equal(result.eventAt.toISOString(), now.toISOString());
      assert.deepEqual(
        buildBiometricMarkUpdate(result.eventAt, ' 1 ', ' ZK-01 '),
        {
          status: ListDetails.PUNTUAL,
          statusSource: AttendanceStatusSource.BIOMETRIC,
          biometricMarkedAt: now,
          biometricVerifyMode: '1',
          biometricDeviceSerial: 'ZK-01',
        }
      );
    }
  });

  test('fails closed for devices, methods and timestamps outside the session', () => {
    const configuration = buildBiometricConfiguration({
      allowedSerials: '',
      fingerprintVerifyModes: '',
      clockSkewSeconds: 0,
    });
    assert.deepEqual(
      evaluateBiometricEvent({
        serialNumber: 'ZK-01',
        verifyMode: '1',
        timestamp: '2026-07-23 09:00:00',
        openedAt: now,
        now,
        configuration,
      }),
      { accepted: false, reason: 'DEVICE_NOT_ALLOWED' }
    );
    assert.equal(parseLimaDeviceTimestamp('2026-02-30 09:00:00'), null);
  });

  test('permits administrative batches only in manual open or biometric review', () => {
    assert.equal(
      canUpdateAttendanceParticipant(
        AttendanceCaptureMode.MANUAL,
        AttendanceListState.OPEN
      ),
      true
    );
    assert.equal(
      canUpdateAttendanceParticipant(
        AttendanceCaptureMode.MANUAL,
        AttendanceListState.FINALIZED
      ),
      false
    );
    assert.equal(
      canUpdateAttendanceParticipant(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.OPEN
      ),
      false
    );
    assert.equal(
      canUpdateAttendanceParticipant(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.REVIEW
      ),
      true
    );
    assert.equal(
      canUpdateAttendanceParticipant(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.FINALIZED
      ),
      false
    );
  });

  test('moves manual and biometric lists through their allowed lifecycle', () => {
    assert.equal(canCloseBiometricAttendance(AttendanceListState.OPEN), true);
    assert.equal(
      canCloseBiometricAttendance(AttendanceListState.REVIEW),
      false
    );
    assert.equal(
      canFinalizeAttendanceList(
        AttendanceCaptureMode.MANUAL,
        AttendanceListState.OPEN
      ),
      true
    );
    assert.equal(
      canFinalizeAttendanceList(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.REVIEW
      ),
      true
    );
    assert.equal(
      canFinalizeAttendanceList(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.OPEN
      ),
      false
    );
  });

  test('allows discarding pending manual and biometric lists only', () => {
    assert.equal(
      canDiscardAttendanceList(
        AttendanceCaptureMode.MANUAL,
        AttendanceListState.OPEN
      ),
      true
    );
    assert.equal(
      canDiscardAttendanceList(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.OPEN
      ),
      true
    );
    assert.equal(
      canDiscardAttendanceList(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.REVIEW
      ),
      true
    );
    assert.equal(
      canDiscardAttendanceList(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceListState.FINALIZED
      ),
      false
    );
    assert.equal(
      canDiscardAttendanceList(
        AttendanceCaptureMode.MANUAL,
        AttendanceListState.FINALIZED
      ),
      false
    );
  });

  test('validates manual finalization, discard identifiers and realtime event', () => {
    assert.equal(
      attendanceListActionRequestSchema.parse({
        params: { id: '12' },
      }).params.id,
      12
    );
    assert.throws(() =>
      attendanceListActionRequestSchema.parse({
        params: { id: 'invalid' },
      })
    );
    assert.equal(
      attendanceListActionRequestSchema.parse({ params: { id: '9' } }).params
        .id,
      9
    );
    assert.equal(
      createAttendanceRequestSchema.parse({
        body: {
          title: 'Primer llamado',
          timer: '08:00',
          captureMode: 'MANUAL',
        },
      }).body.captureMode,
      AttendanceCaptureMode.MANUAL
    );
    assert.deepEqual(
      updateAttendanceBatchRequestSchema.parse({
        params: { id: '9' },
        body: {
          batchId: '11111111-1111-4111-8111-111111111111',
          changes: [{ userId: 7, status: 'PUNTUAL' }],
        },
      }).body.changes,
      [{ userId: 7, status: ListDetails.PUNTUAL }]
    );
    assert.throws(() =>
      updateAttendanceBatchRequestSchema.parse({
        params: { id: '9' },
        body: {
          batchId: '11111111-1111-4111-8111-111111111111',
          changes: [{ userId: 7, status: 'UNKNOWN' }],
        },
      })
    );
    assert.equal(
      ATTENDANCE_SOCKET_EVENTS.statusUpdated,
      'server:attendance-status-updated'
    );
    assert.equal(
      ATTENDANCE_SOCKET_EVENTS.discarded,
      'server:attendance-list-discarded'
    );
  });

  test('marks only summoned F records and ignores unknown, duplicate or closed events', () => {
    assert.equal(
      evaluateBiometricParticipant({
        state: AttendanceListState.OPEN,
        participant: {
          status: ListDetails.SIMPLE,
          biometricMarkedAt: null,
        },
      }),
      'MARK'
    );
    assert.equal(
      evaluateBiometricParticipant({
        state: AttendanceListState.OPEN,
        participant: null,
      }),
      'USER_NOT_SUMMONED'
    );
    assert.equal(
      evaluateBiometricParticipant({
        state: AttendanceListState.OPEN,
        participant: {
          status: ListDetails.PUNTUAL,
          biometricMarkedAt: now,
        },
      }),
      'DUPLICATE_OR_INELIGIBLE'
    );
    assert.equal(
      evaluateBiometricParticipant({
        state: AttendanceListState.OPEN,
        participant: {
          status: ListDetails.PERMISO,
          biometricMarkedAt: null,
        },
      }),
      'DUPLICATE_OR_INELIGIBLE'
    );
    assert.equal(
      evaluateBiometricParticipant({
        state: AttendanceListState.OPEN,
        participant: {
          status: ListDetails.SALIDA,
          biometricMarkedAt: null,
        },
      }),
      'DUPLICATE_OR_INELIGIBLE'
    );
    assert.equal(
      evaluateBiometricParticipant({
        state: AttendanceListState.REVIEW,
        participant: {
          status: ListDetails.SIMPLE,
          biometricMarkedAt: null,
        },
      }),
      'LIST_NOT_OPEN'
    );
  });

  test('keeps only the last batch change and assigns typed administrative origins', () => {
    assert.deepEqual(
      normalizeAttendanceBatchChanges([
        { usersId: 7, status: ListDetails.SIMPLE, reason: ' primero ' },
        { usersId: 7, status: ListDetails.TARDE, reason: ' ultimo ' },
        { usersId: 8, status: ListDetails.PUNTUAL },
      ]),
      [
        { usersId: 7, status: ListDetails.TARDE, reason: 'ultimo' },
        { usersId: 8, status: ListDetails.PUNTUAL },
      ]
    );
    assert.equal(
      resolveAdministrativeStatusSource(
        AttendanceCaptureMode.MANUAL,
        AttendanceStatusSource.SYSTEM_DEFAULT
      ),
      AttendanceStatusSource.MANUAL
    );
    assert.equal(
      resolveAdministrativeStatusSource(
        AttendanceCaptureMode.MANUAL,
        AttendanceStatusSource.MANUAL
      ),
      AttendanceStatusSource.MANUAL_CORRECTION
    );
    assert.equal(
      resolveAdministrativeStatusSource(
        AttendanceCaptureMode.BIOMETRIC,
        AttendanceStatusSource.BIOMETRIC
      ),
      AttendanceStatusSource.MANUAL_CORRECTION
    );
    assert.equal(
      resolveAdministrativeStatusSource(
        AttendanceCaptureMode.MANUAL,
        AttendanceStatusSource.LICENSE
      ),
      AttendanceStatusSource.MANUAL_CORRECTION
    );
  });

  test('validates the complete batch before planning any write', () => {
    const biometricEvidence = new Date('2026-07-23T14:01:00.000Z');
    const participants = [
      {
        usersId: 7,
        status: ListDetails.PUNTUAL,
        statusSource: AttendanceStatusSource.BIOMETRIC,
        biometricMarkedAt: biometricEvidence,
      },
      {
        usersId: 8,
        status: ListDetails.SIMPLE,
        statusSource: AttendanceStatusSource.SYSTEM_DEFAULT,
        biometricMarkedAt: null,
      },
    ];
    assert.throws(() =>
      planAttendanceBatchChanges({
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.REVIEW,
        participants,
        changes: [
          { usersId: 8, status: ListDetails.TARDE },
          { usersId: 7, status: ListDetails.TARDE },
        ],
      })
    );
    const planned = planAttendanceBatchChanges({
      captureMode: AttendanceCaptureMode.BIOMETRIC,
      state: AttendanceListState.REVIEW,
      participants,
      changes: [
        {
          usersId: 7,
          status: ListDetails.TARDE,
          reason: 'Marcación duplicada',
        },
        { usersId: 8, status: ListDetails.PUNTUAL },
      ],
    });
    assert.equal(planned.length, 2);
    assert.equal(
      planned[0].nextSource,
      AttendanceStatusSource.MANUAL_CORRECTION
    );
    assert.equal(planned[0].participant.biometricMarkedAt, biometricEvidence);
    assert.throws(() =>
      planAttendanceBatchChanges({
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.OPEN,
        participants: [participants[0]],
        changes: [
          { usersId: 7, status: ListDetails.TARDE, reason: 'No aplica' },
        ],
      })
    );
    assert.throws(() =>
      planAttendanceBatchChanges({
        captureMode: AttendanceCaptureMode.MANUAL,
        state: AttendanceListState.FINALIZED,
        participants: [participants[1]],
        changes: [{ usersId: 8, status: ListDetails.PUNTUAL }],
      })
    );
  });

  test('requires a trusted authenticated actor identifier for administrative batches', () => {
    assert.equal(isValidAttendanceActorId(99), true);
    assert.equal(isValidAttendanceActorId(0), false);
    assert.equal(isValidAttendanceActorId(Number.NaN), false);
  });

  test('writes semantic attendance audit data through the supplied transaction', async () => {
    const writes: unknown[] = [];
    const tx = {
      auditLog: {
        create: async (input: unknown) => {
          writes.push(input);
          return input;
        },
      },
    };
    await createAttendanceAuditEvent(tx as never, {
      action: 'ATTENDANCE_STATUS_CHANGED',
      actorId: 99,
      details: {
        listId: 9,
        affectedUserId: 7,
        previousStatus: ListDetails.PUNTUAL,
        nextStatus: ListDetails.TARDE,
        previousSource: AttendanceStatusSource.BIOMETRIC,
        nextSource: AttendanceStatusSource.MANUAL_CORRECTION,
        reason: 'Marcación duplicada',
        batchId: '11111111-1111-4111-8111-111111111111',
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.REVIEW,
      },
    });
    assert.equal(writes.length, 1);
    assert.deepEqual(
      (writes[0] as { data: { userId: number; action: string } }).data.userId,
      99
    );
  });
});
