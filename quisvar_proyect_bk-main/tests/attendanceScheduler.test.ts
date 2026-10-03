import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AttendanceCaptureMode,
  AttendanceListState,
} from '@prisma/client';
import AttendanceCallConfigService from '../src/services/attendance/attendanceCallConfig.service';
import AttendanceListService from '../src/services/attendance/attendanceList.service';
import BiometricAttendanceService from '../src/services/attendance/biometricAttendance.service';
import AttendanceSchedulerService from '../src/services/attendance/attendanceScheduler.service';
import { prisma } from '../src/utils/prisma.server';

type MutableScheduler = {
  autoFinalizeReview: (now?: Date) => Promise<unknown>;
  autoFinalizeManualCalls: (now?: Date) => Promise<unknown>;
  autoCloseCaptureWindow: (now?: Date) => Promise<unknown>;
  notifyClosingSoon: (now?: Date) => Promise<unknown>;
  autoOpenNextCall: (now?: Date) => Promise<unknown>;
  runTick: (now?: Date) => Promise<void>;
  activeTick: Promise<void> | null;
};

test('opens only the next configured call and never while another list is active', async () => {
  const list = prisma.list as unknown as Record<string, unknown>;
  const originalFindFirst = list.findFirst;
  const originalFindMany = list.findMany;
  const originalResolve = AttendanceCallConfigService.resolveCallsForDate;
  const originalCreate = AttendanceListService.create;
  const created: unknown[] = [];

  list.findFirst = async () => null;
  list.findMany = async () => [];
  AttendanceCallConfigService.resolveCallsForDate = async () => [
    {
      callConfigId: 4,
      position: 1,
      title: 'Primer llamado',
      captureStartTime: '08:00',
      captureEndTime: '08:15',
      captureMode: AttendanceCaptureMode.BIOMETRIC,
    },
  ];
  AttendanceListService.create = async input => {
    created.push(input);
    return { id: 99 } as never;
  };

  try {
    await AttendanceSchedulerService.autoOpenNextCall(
      new Date('2026-07-23T13:05:00.000Z')
    );
    assert.equal(created.length, 1);
    assert.deepEqual(created[0], {
      title: 'Primer llamado',
      timer: '08:00',
      captureMode: AttendanceCaptureMode.BIOMETRIC,
      callConfigId: 4,
      captureWindowEndsAt: new Date('2026-07-23T13:15:00.000Z'),
    });

    list.findFirst = async () => ({ id: 11 });
    await AttendanceSchedulerService.autoOpenNextCall(
      new Date('2026-07-23T13:05:00.000Z')
    );
    assert.equal(created.length, 1);
  } finally {
    list.findFirst = originalFindFirst;
    list.findMany = originalFindMany;
    AttendanceCallConfigService.resolveCallsForDate = originalResolve;
    AttendanceListService.create = originalCreate;
  }
});

test('moves expired biometric capture to review and finalizes an expired review', async () => {
  const list = prisma.list as unknown as Record<string, unknown>;
  const originalFindMany = list.findMany;
  const originalClose = BiometricAttendanceService.close;
  const originalFinalize = AttendanceListService.finalize;
  const closes: unknown[] = [];
  const finalizations: unknown[] = [];

  list.findMany = async () => [{ id: 7 }];
  BiometricAttendanceService.close = async (...args) => {
    closes.push(args);
    return {} as never;
  };
  AttendanceListService.finalize = async (...args) => {
    finalizations.push(args);
    return {} as never;
  };

  try {
    const now = new Date('2026-07-23T14:00:00.000Z');
    await AttendanceSchedulerService.autoCloseCaptureWindow(now);
    await AttendanceSchedulerService.autoFinalizeReview(now);
    assert.deepEqual(closes, [[7, null, new Date('2026-07-23T15:00:00.000Z')]]);
    assert.deepEqual(finalizations, [[7, null]]);
  } finally {
    list.findMany = originalFindMany;
    BiometricAttendanceService.close = originalClose;
    AttendanceListService.finalize = originalFinalize;
  }
});

test('serializes duplicate ticks while preserving the lifecycle order', async () => {
  const scheduler = AttendanceSchedulerService as unknown as MutableScheduler;
  const methods = [
    'autoFinalizeReview',
    'autoFinalizeManualCalls',
    'autoCloseCaptureWindow',
    'notifyClosingSoon',
    'autoOpenNextCall',
  ] as const;
  const originals = methods.map(method => scheduler[method]);
  const calls: string[] = [];
  let releaseFirstStep: (() => void) | undefined;
  const firstStep = new Promise<void>(resolve => {
    releaseFirstStep = resolve;
  });

  scheduler.autoFinalizeReview = async () => {
    calls.push('review');
    await firstStep;
  };
  scheduler.autoFinalizeManualCalls = async () => calls.push('manual');
  scheduler.autoCloseCaptureWindow = async () => calls.push('close');
  scheduler.notifyClosingSoon = async () => calls.push('notify');
  scheduler.autoOpenNextCall = async () => calls.push('open');

  try {
    const tick = AttendanceSchedulerService.runTick(
      new Date('2026-07-23T14:00:00.000Z')
    );
    const duplicate = AttendanceSchedulerService.runTick(
      new Date('2026-07-23T14:00:30.000Z')
    );
    assert.equal(tick, duplicate);
    releaseFirstStep?.();
    await tick;
    assert.deepEqual(calls, ['review', 'manual', 'close', 'notify', 'open']);
    assert.equal(scheduler.activeTick, null);
  } finally {
    methods.forEach((method, index) => {
      scheduler[method] = originals[index];
    });
  }
});
