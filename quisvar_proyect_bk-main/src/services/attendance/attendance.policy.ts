import {
  AttendanceCaptureMode,
  AttendanceListState,
  AttendanceStatusSource,
  LicenseType,
  ListDetails,
} from '@prisma/client';

export type BiometricConfiguration = {
  allowedSerials: ReadonlySet<string>;
  fingerprintVerifyModes: ReadonlySet<string>;
  clockSkewSeconds: number;
};

export type BiometricEventEvaluation =
  | { accepted: true; eventAt: Date }
  | {
      accepted: false;
      reason:
        | 'DEVICE_NOT_ALLOWED'
        | 'VERIFY_MODE_NOT_ALLOWED'
        | 'INVALID_TIMESTAMP'
        | 'EVENT_BEFORE_OPEN'
        | 'EVENT_IN_FUTURE';
    };

export type AttendanceBatchChange = {
  usersId: number;
  status: ListDetails;
  reason?: string;
};

export type AttendanceBatchParticipantSnapshot = {
  usersId: number;
  status: ListDetails;
  statusSource: AttendanceStatusSource;
  biometricMarkedAt: Date | null;
};

export const orderAttendanceRows = <T>(
  rows: readonly T[],
  getHierarchy: (row: T) => number | null | undefined
) => {
  const generalManagement: T[] = [];
  const management: T[] = [];
  const remainingRows: T[] = [];

  rows.forEach(row => {
    const hierarchy = getHierarchy(row);
    if (hierarchy === 1) {
      generalManagement.push(row);
      return;
    }
    if (hierarchy === 2) {
      management.push(row);
      return;
    }
    remainingRows.push(row);
  });

  return [...generalManagement, ...management, ...remainingRows];
};

export const isValidAttendanceActorId = (actorId: number) =>
  Number.isInteger(actorId) && actorId > 0;

export const resolveAttendanceListLifecycle = (
  captureMode: AttendanceCaptureMode,
  now: Date
) => ({
  captureMode,
  state: AttendanceListState.OPEN,
  openedAt: now,
});

export const buildAttendanceParticipantRows = (
  listId: number,
  userIds: number[],
  licenses: Array<{ usersId: number; type: LicenseType | null }>
) => {
  const licenseByUser = new Map(
    licenses
      .filter(
        (license): license is { usersId: number; type: LicenseType } =>
          license.type !== null
      )
      .map(license => [license.usersId, license.type])
  );
  return userIds.map(usersId => ({
    usersId,
    listId,
    status: licenseByUser.get(usersId) ?? ListDetails.SIMPLE,
    statusSource: licenseByUser.has(usersId)
      ? AttendanceStatusSource.LICENSE
      : AttendanceStatusSource.SYSTEM_DEFAULT,
  }));
};

export const canUpdateAttendanceParticipant = (
  captureMode: AttendanceCaptureMode,
  state: AttendanceListState
) =>
  (captureMode === AttendanceCaptureMode.MANUAL &&
    state === AttendanceListState.OPEN) ||
  (captureMode === AttendanceCaptureMode.BIOMETRIC &&
    state === AttendanceListState.REVIEW);

export const canFinalizeAttendanceList = (
  captureMode: AttendanceCaptureMode,
  state: AttendanceListState
) =>
  (captureMode === AttendanceCaptureMode.MANUAL &&
    state === AttendanceListState.OPEN) ||
  (captureMode === AttendanceCaptureMode.BIOMETRIC &&
    state === AttendanceListState.REVIEW);

export const resolveAdministrativeStatusSource = (
  captureMode: AttendanceCaptureMode,
  currentSource: AttendanceStatusSource
) =>
  captureMode === AttendanceCaptureMode.MANUAL &&
  currentSource === AttendanceStatusSource.SYSTEM_DEFAULT
    ? AttendanceStatusSource.MANUAL
    : AttendanceStatusSource.MANUAL_CORRECTION;

export const canDiscardAttendanceList = (
  captureMode: AttendanceCaptureMode,
  state: AttendanceListState
) =>
  (captureMode === AttendanceCaptureMode.MANUAL &&
    state === AttendanceListState.OPEN) ||
  (captureMode === AttendanceCaptureMode.BIOMETRIC &&
    (state === AttendanceListState.OPEN ||
      state === AttendanceListState.REVIEW));

export const evaluateBiometricParticipant = ({
  state,
  participant,
}: {
  state: AttendanceListState;
  participant: { status: ListDetails; biometricMarkedAt: Date | null } | null;
}) => {
  if (state !== AttendanceListState.OPEN) return 'LIST_NOT_OPEN' as const;
  if (!participant) return 'USER_NOT_SUMMONED' as const;
  if (
    participant.status !== ListDetails.SIMPLE ||
    participant.biometricMarkedAt
  ) {
    return 'DUPLICATE_OR_INELIGIBLE' as const;
  }
  return 'MARK' as const;
};

export const buildBiometricMarkUpdate = (
  eventAt: Date,
  verifyMode: string,
  serialNumber: string
) => ({
  status: ListDetails.PUNTUAL,
  statusSource: AttendanceStatusSource.BIOMETRIC,
  biometricMarkedAt: eventAt,
  biometricVerifyMode: verifyMode.trim(),
  biometricDeviceSerial: serialNumber.trim(),
});

export const canCloseBiometricAttendance = (state: AttendanceListState) =>
  state === AttendanceListState.OPEN;

const splitConfiguration = (value?: string) =>
  new Set(
    (value ?? '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  );

export const buildBiometricConfiguration = ({
  allowedSerials,
  fingerprintVerifyModes,
  clockSkewSeconds,
}: {
  allowedSerials?: string;
  fingerprintVerifyModes?: string;
  clockSkewSeconds: number;
}): BiometricConfiguration => ({
  allowedSerials: splitConfiguration(allowedSerials),
  fingerprintVerifyModes: splitConfiguration(fingerprintVerifyModes),
  clockSkewSeconds,
});

export const parseLimaDeviceTimestamp = (value: string): Date | null => {
  const match =
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})[ T](?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})$/.exec(
      value.trim()
    );
  if (!match?.groups) return null;

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const hour = Number(match.groups.hour);
  const minute = Number(match.groups.minute);
  const second = Number(match.groups.second);
  const eventAt = new Date(
    Date.UTC(year, month - 1, day, hour + 5, minute, second)
  );
  const limaWallClock = new Date(eventAt.getTime() - 5 * 60 * 60 * 1000);

  const isSameWallClock =
    limaWallClock.getUTCFullYear() === year &&
    limaWallClock.getUTCMonth() === month - 1 &&
    limaWallClock.getUTCDate() === day &&
    limaWallClock.getUTCHours() === hour &&
    limaWallClock.getUTCMinutes() === minute &&
    limaWallClock.getUTCSeconds() === second;

  return isSameWallClock ? eventAt : null;
};

export const evaluateBiometricEvent = ({
  serialNumber,
  verifyMode,
  timestamp,
  openedAt,
  now,
  configuration,
}: {
  serialNumber: string;
  verifyMode: string;
  timestamp: string;
  openedAt: Date;
  now: Date;
  configuration: BiometricConfiguration;
}): BiometricEventEvaluation => {
  if (!configuration.allowedSerials.has(serialNumber.trim())) {
    return { accepted: false, reason: 'DEVICE_NOT_ALLOWED' };
  }
  if (!configuration.fingerprintVerifyModes.has(verifyMode.trim())) {
    return { accepted: false, reason: 'VERIFY_MODE_NOT_ALLOWED' };
  }

  const eventAt = parseLimaDeviceTimestamp(timestamp);
  if (!eventAt) return { accepted: false, reason: 'INVALID_TIMESTAMP' };
  if (eventAt < openedAt) {
    return { accepted: false, reason: 'EVENT_BEFORE_OPEN' };
  }
  if (
    eventAt.getTime() >
    now.getTime() + configuration.clockSkewSeconds * 1000
  ) {
    return { accepted: false, reason: 'EVENT_IN_FUTURE' };
  }

  return { accepted: true, eventAt };
};

export const normalizeAttendanceBatchChanges = (
  value: AttendanceBatchChange[]
): AttendanceBatchChange[] => {
  const unique = new Map<number, AttendanceBatchChange>();
  value.forEach(change => {
    unique.set(change.usersId, {
      usersId: change.usersId,
      status: change.status,
      ...(change.reason?.trim() ? { reason: change.reason.trim() } : {}),
    });
  });
  return [...unique.values()];
};

export const planAttendanceBatchChanges = ({
  captureMode,
  state,
  participants,
  changes,
}: {
  captureMode: AttendanceCaptureMode;
  state: AttendanceListState;
  participants: AttendanceBatchParticipantSnapshot[];
  changes: AttendanceBatchChange[];
}) => {
  if (!canUpdateAttendanceParticipant(captureMode, state)) {
    throw new Error(
      captureMode === AttendanceCaptureMode.BIOMETRIC &&
      state === AttendanceListState.OPEN
        ? 'Cierre la captura biometrica antes de editar'
        : 'La lista ya no admite correcciones administrativas'
    );
  }
  const participantById = new Map(
    participants.map(participant => [participant.usersId, participant])
  );
  if (participantById.size !== changes.length) {
    throw new Error('Uno o mas usuarios no pertenecen a la lista seleccionada');
  }

  return changes.flatMap(change => {
    const participant = participantById.get(change.usersId);
    if (!participant) {
      throw new Error(
        'Uno o mas usuarios no pertenecen a la lista seleccionada'
      );
    }
    if (participant.status === change.status) return [];
    if (
      participant.statusSource === AttendanceStatusSource.BIOMETRIC &&
      !change.reason
    ) {
      throw new Error(
        `Debe indicar un motivo para corregir la huella del usuario ${change.usersId}`
      );
    }
    return [
      {
        ...change,
        participant,
        nextSource: resolveAdministrativeStatusSource(
          captureMode,
          participant.statusSource
        ),
      },
    ];
  });
};
