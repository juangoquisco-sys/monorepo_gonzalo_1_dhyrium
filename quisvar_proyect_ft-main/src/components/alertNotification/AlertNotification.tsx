import { useContext, useEffect, useRef, useState } from 'react';
import './AlertNotification.css';
import { motion } from 'framer-motion';
import { SocketContext } from '@/context/SocketContex';
import notificationSound from '/sounds/notification.mp3';
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Fingerprint,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import useCurrentAttendance, {
  currentAttendanceQueryKey,
} from '@/pages/attendance/hooks/useCurrentAttendance';
import {
  ATTENDANCE_STATUS_LABELS,
  normalizeAttendanceStatus,
} from '@/models/attendanceStatus';
import type { CurrentAttendance } from '@/pages/attendance/attendance.types';
import { ATTENDANCE_REALTIME_EVENTS } from '@/pages/attendance/attendanceRealtime';
const DISMISSED_FINALIZED_LIST_KEY = 'attendance-finalized-dismissed:v1';

const playNotification = () => {
  const audio = new Audio(notificationSound);
  void audio.play().catch(() => undefined);
};

const readDismissedListId = () => {
  try {
    const value = localStorage.getItem(DISMISSED_FINALIZED_LIST_KEY);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
};

const attendanceCopy = (
  attendance: NonNullable<CurrentAttendance['attendance']>
) => {
  const status = normalizeAttendanceStatus(attendance.status);
  if (
    attendance.state === 'OPEN' &&
    attendance.statusSource === 'SYSTEM_DEFAULT' &&
    status === 'SIMPLE'
  ) {
    return {
      status:
        attendance.captureMode === 'BIOMETRIC'
          ? 'Pendiente de marcar huella'
          : 'Pendiente de confirmación',
      origin: 'Estado inicial del llamado',
    };
  }
  if (
    attendance.captureMode === 'BIOMETRIC' &&
    attendance.state === 'OPEN' &&
    attendance.statusSource === 'BIOMETRIC' &&
    status === 'PUNTUAL'
  ) {
    return { status: 'Presente — huella validada', origin: 'Huella validada' };
  }
  const originBySource = {
    SYSTEM_DEFAULT: 'Estado inicial del llamado',
    BIOMETRIC: 'Huella validada',
    MANUAL: 'Registrado por el encargado',
    MANUAL_CORRECTION: 'Corregido por el encargado',
    LICENSE: 'Licencia o salida vigente',
  } as const;
  return {
    status: ATTENDANCE_STATUS_LABELS[status],
    origin: originBySource[attendance.statusSource],
  };
};

const formatMarkedAt = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(value))
    : null;

const LIST_STATE_LABELS = {
  OPEN: 'Abierta',
  REVIEW: 'En revisión',
  FINALIZED: 'Finalizada',
} as const;

const AlertNotification = () => {
  const socket = useContext(SocketContext);
  const queryClient = useQueryClient();
  const currentAttendanceQuery = useCurrentAttendance();
  const [minimizedListId, setMinimizedListId] = useState<number | null>(null);
  const [dismissedListId, setDismissedListId] = useState<number | null>(
    readDismissedListId
  );
  const announcedListId = useRef<number | null>(null);
  const attendance = currentAttendanceQuery.data?.attendance ?? null;

  useEffect(() => {
    const refreshAttendance = () => {
      void queryClient.invalidateQueries({
        queryKey: currentAttendanceQueryKey,
      });
    };
    ATTENDANCE_REALTIME_EVENTS.forEach(event =>
      socket.on(event, refreshAttendance)
    );
    socket.on('connect', refreshAttendance);
    return () => {
      ATTENDANCE_REALTIME_EVENTS.forEach(event =>
        socket.off(event, refreshAttendance)
      );
      socket.off('connect', refreshAttendance);
    };
  }, [queryClient, socket]);

  useEffect(() => {
    if (!attendance) {
      announcedListId.current = null;
      return;
    }
    if (announcedListId.current !== attendance.listId) {
      announcedListId.current = attendance.listId;
      if (dismissedListId !== attendance.listId) playNotification();
    }
  }, [attendance, dismissedListId]);

  const dismissFinalized = () => {
    if (!attendance || attendance.state !== 'FINALIZED') return;
    try {
      localStorage.setItem(
        DISMISSED_FINALIZED_LIST_KEY,
        String(attendance.listId)
      );
    } catch {
      // The close still applies to the current render if storage is unavailable.
    }
    setDismissedListId(attendance.listId);
  };

  const isDismissed =
    attendance?.state === 'FINALIZED' && dismissedListId === attendance.listId;
  const visibleAttendance = isDismissed ? null : attendance;
  if (!visibleAttendance) return null;
  if (
    minimizedListId === visibleAttendance.listId &&
    visibleAttendance.state !== 'FINALIZED'
  ) {
    const copy = attendanceCopy(visibleAttendance);
    return (
      <button
        type="button"
        className="alertNotify-minimized"
        onClick={() => setMinimizedListId(null)}
        aria-label="Expandir estado de asistencia"
      >
        {visibleAttendance.captureMode === 'BIOMETRIC' ? (
          <Fingerprint size={18} />
        ) : (
          <ClipboardCheck size={18} />
        )}
        <span>{copy.status}</span>
        <ChevronUp size={17} />
      </button>
    );
  }

  const copy = attendanceCopy(visibleAttendance);
  const markedAt = formatMarkedAt(visibleAttendance.biometricMarkedAt);

  return (
    <motion.aside
      className="alertNotify-content alertNotify-content--attendance"
      initial={{ x: '+100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.35 }}
      aria-live="polite"
    >
      <div className="alertNotify-heading">
        <div>
          <span className="alertNotify-eyebrow">
            {visibleAttendance.captureMode === 'BIOMETRIC'
              ? 'Asistencia biométrica'
              : 'Asistencia manual'}
          </span>
          <h4 className="alertNotify-title">
            {visibleAttendance.title ?? 'Lista de asistencia'}
          </h4>
        </div>
        <button
          type="button"
          className="alertNotify-iconButton"
          onClick={
            visibleAttendance.state === 'FINALIZED'
              ? dismissFinalized
              : () => setMinimizedListId(visibleAttendance.listId)
          }
          aria-label={
            visibleAttendance.state === 'FINALIZED'
              ? 'Cerrar resultado de asistencia'
              : 'Minimizar estado de asistencia'
          }
        >
          {visibleAttendance.state === 'FINALIZED' ? (
            <X size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </button>
      </div>

      <div className="alertNotify-attendanceBody">
        <div className="alertNotify-statusRow">
          <span className="alertNotify-status">{copy.status}</span>
          <span className="alertNotify-finality">
            {visibleAttendance.definitive ? 'Definitivo' : 'Provisional'}
          </span>
        </div>
        <dl className="alertNotify-metadata">
          <div>
            <dt>Hora del llamado</dt>
            <dd>{visibleAttendance.timer ?? '—'}</dd>
          </div>
          <div>
            <dt>Estado de lista</dt>
            <dd>{LIST_STATE_LABELS[visibleAttendance.state]}</dd>
          </div>
          {markedAt ? (
            <div>
              <dt>Huella</dt>
              <dd>{markedAt}</dd>
            </div>
          ) : null}
        </dl>
        <p className="alertNotify-origin">{copy.origin}</p>
      </div>
    </motion.aside>
  );
};

export default AlertNotification;
