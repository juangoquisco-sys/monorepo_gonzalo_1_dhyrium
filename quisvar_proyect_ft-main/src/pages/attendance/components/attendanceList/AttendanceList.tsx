import './AttendanceList.css';
import Input from '@/components/Input/Input';
import type {
  AttendanceCaptureMode,
  AttendanceListState,
  AttendanceParticipant,
} from '../../attendance.types';
import {
  ATTENDANCE_STATUS_RADIO_OPTIONS,
  normalizeAttendanceStatus,
} from '@/models/attendanceStatus';
import type { AttendanceStatus } from '@/models/attendanceStatus';
import { Fingerprint } from 'lucide-react';

const biometricTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Lima',
});

const getBiometricMarking = (
  participant: AttendanceParticipant,
  listState: AttendanceListState
) => {
  if (participant.biometricMarkedAt) {
    return {
      kind: 'captured',
      label: biometricTimeFormatter.format(
        new Date(participant.biometricMarkedAt)
      ),
      title: 'Huella validada',
    } as const;
  }
  if (participant.statusSource === 'LICENSE') {
    return {
      kind: 'exempt',
      label: 'No aplica',
      title: 'Licencia o salida vigente',
    } as const;
  }
  return listState === 'OPEN'
    ? ({
        kind: 'pending',
        label: 'Pendiente',
        title: 'Pendiente de marcar huella',
      } as const)
    : ({
        kind: 'missing',
        label: 'Sin huella',
        title: 'No registró una huella durante la captura',
      } as const);
};

interface BiometricMarkingProps {
  participant: AttendanceParticipant;
  listState: AttendanceListState;
  mobile?: boolean;
}

const BiometricMarking = ({
  participant,
  listState,
  mobile = false,
}: BiometricMarkingProps) => {
  const marking = getBiometricMarking(participant, listState);

  return (
    <span
      className={`attendanceList-marking attendanceList-marking--${
        marking.kind
      } ${
        mobile
          ? 'attendanceList-marking--mobile'
          : 'attendanceList-marking--desktop'
      }`}
      title={marking.title}
      aria-label={
        marking.kind === 'captured'
          ? `${marking.title}: ${marking.label}`
          : marking.title
      }
    >
      {marking.kind === 'captured' ? (
        <Fingerprint size={13} strokeWidth={2} aria-hidden="true" />
      ) : null}
      <span>{marking.label}</span>
    </span>
  );
};

interface AttendanceListProps {
  onRadioChange: (value: AttendanceStatus, id: number) => void;
  participant: AttendanceParticipant;
  captureMode: AttendanceCaptureMode;
  listState: AttendanceListState;
  index: number;
  selectedStatus?: string | null;
  disabled?: boolean;
}
export const AttendanceList = ({
  onRadioChange,
  participant,
  captureMode,
  listState,
  index,
  selectedStatus = null,
  disabled,
}: AttendanceListProps) => {
  const currentStatus = normalizeAttendanceStatus(
    selectedStatus ?? participant.status
  );
  const isDisabled = disabled || participant.statusSource === 'LICENSE';
  const profile = participant.user.profile;
  const displayName = profile
    ? `${profile.lastName} ${profile.firstName}`.trim()
    : participant.user.email;
  const isBiometric = captureMode === 'BIOMETRIC';

  const handleRadioChange = (value: AttendanceStatus) => {
    onRadioChange(value, participant.usersId);
  };

  return (
    <div
      className={`attendanceList-container ${
        index % 2 !== 0 && 'attendanceList-bg'
      }`}
    >
      <div className="attendanceList-col attendanceList-place hide-field">
        {index + 1}
      </div>
      <div className="attendanceList-col attendanceList-place hide-field">
        {profile?.room ?? '---'}
      </div>
      <div className="attendanceList-col attendanceList-name">
        <span className="attendanceList-personName">{displayName}</span>
        {isBiometric ? (
          <BiometricMarking
            participant={participant}
            listState={listState}
            mobile
          />
        ) : null}
      </div>
      <div className="attendanceList-col hide-field">
        {profile?.dni ?? '---'}
      </div>
      {isBiometric ? (
        <div className="attendanceList-col attendanceList-place hide-field">
          <BiometricMarking participant={participant} listState={listState} />
        </div>
      ) : (
        <div className="attendanceList-col hide-field">
          {profile?.phone ?? '---'}
        </div>
      )}
      {ATTENDANCE_STATUS_RADIO_OPTIONS.map(option => (
        <div
          key={option.value}
          className={`attendanceList-col attendanceList-place attendanceList-config ${option.className}`}
        >
          <Input
            type="radio"
            value={option.value}
            classNameMain="attendanceList-radio"
            checked={currentStatus === option.value}
            onChange={() => handleRadioChange(option.value)}
            disabled={isDisabled}
          />
        </div>
      ))}
    </div>
  );
};

export default AttendanceList;
