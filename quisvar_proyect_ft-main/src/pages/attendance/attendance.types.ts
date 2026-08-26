import type { AttendanceStatus } from '@/models/attendanceStatus';

export type AttendanceCaptureMode = 'MANUAL' | 'BIOMETRIC';
export type AttendanceListState = 'OPEN' | 'REVIEW' | 'FINALIZED';
export type AttendanceStatusSource =
  | 'SYSTEM_DEFAULT'
  | 'BIOMETRIC'
  | 'MANUAL'
  | 'MANUAL_CORRECTION'
  | 'LICENSE';

export type AttendanceParticipant = {
  usersId: number;
  listId: number;
  status: AttendanceStatus;
  statusSource: AttendanceStatusSource;
  assignedAt: string;
  biometricMarkedAt: string | null;
  biometricVerifyMode: string | null;
  biometricDeviceSerial: string | null;
  user: {
    id: number;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      dni: string;
      phone: string;
      room: string | null;
      userPc: string | null;
    } | null;
  };
};

export type AttendanceList = {
  createdAt: string;
  id: number;
  title: string | null;
  timer: string | null;
  position: number;
  captureMode: AttendanceCaptureMode;
  state: AttendanceListState;
  openedAt: string | null;
  closedAt: string | null;
  finalizedAt: string | null;
  users: AttendanceParticipant[];
};

export type CurrentAttendance = {
  attendance: {
    listId: number;
    title: string | null;
    timer: string | null;
    captureMode: AttendanceCaptureMode;
    state: AttendanceListState;
    openedAt: string | null;
    finalizedAt: string | null;
    status: AttendanceStatus;
    statusSource: AttendanceStatusSource;
    biometricMarkedAt: string | null;
    provisional: boolean;
    definitive: boolean;
  } | null;
};

export type AttendanceBatchChange = {
  userId: number;
  status: AttendanceStatus;
  reason?: string;
};

export type AttendanceBatchResponse = {
  batchId: string;
  listId: number;
  participants: Array<{
    userId: number;
    status: AttendanceStatus;
    statusSource: AttendanceStatusSource;
    biometricMarkedAt: string | null;
  }>;
};

export type PendingAttendance = {
  id: number;
  title: string | null;
  timer: string | null;
  captureMode: AttendanceCaptureMode;
  state: Exclude<AttendanceListState, 'FINALIZED'>;
  openedAt: string | null;
  createdAt: string;
};
