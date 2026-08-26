// import { Input } from '../../../components';
import { useContext, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import type { licenseList } from '@/types/types';
import './LicenseListItem.css';
import { formatDate } from '@/utils/formatDate';
import ButtonDelete from '@/components/button/ButtonDelete';
import Button from '@/components/button/Button';
import DefaultUserImage from '@/components/defaultUserImage/DefaultUserImage';
import { SocketContext } from '@/context/SocketContex';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { ATTENDANCE_STATUS_LABELS } from '@/models/attendanceStatus';
type license = {
  isEmployee: boolean;
  data: licenseList;
  index: number;
  editData?: () => void;
  onSave?: () => void;
};
interface NameParts {
  firstName: string;
  lastName: string;
}
type MultipleDateItem = {
  startDate: string;
  untilDate: string;
};
type MultipleDateStatus = {
  label: string;
  className: string;
};
const STATUS_INFO = {
  PROCESO: { label: 'Pendiente', className: 'license-status-pending' },
  NO_ATENDIDO: { label: 'No atendido', className: 'license-status-unattended' },
  ACEPTADO: { label: 'Aprobado', className: 'license-status-approved' },
  ACTIVO: { label: 'En curso', className: 'license-status-active' },
  INACTIVO: { label: 'Finalizado', className: 'license-status-finished' },
  DENEGADO: { label: 'Rechazado', className: 'license-status-rejected' },
};

const isSystemFeedbackText = (value = '') => {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return false;
  return (
    normalizedValue === 'no atendido' ||
    normalizedValue.includes('desde control de puerta')
  );
};

const parseReason = (reason = '', type?: string) => {
  const separators = [' - Proyecto: ', ' - '];
  const separator = separators.find(item => reason.includes(item));
  if (separator) {
    const [motivo, ...descriptionParts] = reason.split(separator);
    return {
      motivo,
      description: descriptionParts.join(separator) || '---',
    };
  }
  if (type === 'PERMISO' && reason) {
    return {
      motivo: 'Licencia personal',
      description: reason,
    };
  }
  return {
    motivo: reason || '---',
    description: '---',
  };
};

const ARRIVAL_STATUS_INFO = {
  NO_REGISTER: {
    label: 'Ingreso no registrado',
    description: 'Ingreso no registrado: falta muy grave',
    className: 'license-arrival-no-register',
  },
  EARLY: {
    label: 'Llegada anticipada',
    description: 'Llegada anticipada',
    className: 'license-arrival-early',
  },
  PUNTUAL: {
    label: ATTENDANCE_STATUS_LABELS.PUNTUAL,
    description: ATTENDANCE_STATUS_LABELS.PUNTUAL,
    className: 'license-arrival-punctual',
  },
  TARDE: {
    label: ATTENDANCE_STATUS_LABELS.TARDE,
    description: ATTENDANCE_STATUS_LABELS.TARDE,
    className: 'license-arrival-late',
  },
  SIMPLE: {
    label: ATTENDANCE_STATUS_LABELS.SIMPLE,
    description: ATTENDANCE_STATUS_LABELS.SIMPLE,
    className: 'license-arrival-simple',
  },
  GRAVE: {
    label: ATTENDANCE_STATUS_LABELS.GRAVE,
    description: ATTENDANCE_STATUS_LABELS.GRAVE,
    className: 'license-arrival-grave',
  },
  MUY_GRAVE: {
    label: ATTENDANCE_STATUS_LABELS.MUY_GRAVE,
    description: ATTENDANCE_STATUS_LABELS.MUY_GRAVE,
    className: 'license-arrival-critical',
  },
};

const getLicensePersonName = (
  person?: licenseList['user'] | licenseList['supervisor'] | null,
  fallback?: string
) => {
  if (!person?.profile) return fallback;
  const name = `${person.profile.firstName} ${person.profile.lastName}`.trim();

  return name || fallback;
};

export const LicenseListItem = ({
  isEmployee,
  data,
  index,
  editData,
  onSave,
}: license) => {
  const socket = useContext(SocketContext);
  const [feedback, setFeedback] = useState('');
  const [arrivalValue, setArrivalValue] = useState('');
  const [isEditingArrival, setIsEditingArrival] = useState(false);
  const [showMultipleDates, setShowMultipleDates] = useState(false);
  const [observation, setObservation] = useState(data.feedback ?? '');
  const { id } = useSelector((state: RootState) => state.userSession);
  const userName = getLicensePersonName(data.user, `Usuario ${data.usersId}`);
  const supervisorName = getLicensePersonName(data.supervisor);
  const reasonInfo = parseReason(data.reason, data.type);
  const multipleDates = (() => {
    if (!data.isRecurringParent || !data.recurrenceRule) return [];
    try {
      const parsed = JSON.parse(data.recurrenceRule) as {
        occurrences?: MultipleDateItem[];
      };
      return parsed.occurrences ?? [];
    } catch {
      return [];
    }
  })();
  const hasMultipleDates = multipleDates.length > 0;
  const getMultipleDateStatus = (
    item: MultipleDateItem
  ): MultipleDateStatus => {
    if (data.status === 'PROCESO') {
      return {
        label: 'Pendiente',
        className: 'license-multiple-status-pending',
      };
    }
    if (data.status === 'DENEGADO') {
      return {
        label: 'Rechazada',
        className: 'license-multiple-status-rejected',
      };
    }
    const now = new Date();
    const startDate = new Date(item.startDate);
    const untilDate = new Date(item.untilDate);
    if (now < startDate) {
      return {
        label: 'Por activarse',
        className: 'license-multiple-status-approved',
      };
    }
    if (now >= startDate && now <= untilDate) {
      return {
        label: 'En curso',
        className: 'license-multiple-status-active',
      };
    }
    return {
      label: 'Finalizada',
      className: 'license-multiple-status-finished',
    };
  };
  const isPendingExpired = () => {
    if (licenseStatus !== 'PROCESO') return false;
    const GMT = 5 * 60 * 60 * 1000;
    const startDate = new Date(new Date(data.startDate).getTime() + GMT);
    const unattendedLimit = new Date(startDate.getTime() + 10 * 60 * 1000);
    return new Date().getTime() > unattendedLimit.getTime();
  };
  const licenseStatus = data.status ?? 'PROCESO';
  const pendingExpired = isPendingExpired();
  const unattendedBySystem =
    licenseStatus === 'DENEGADO' &&
    (data.feedback || '').trim().toLowerCase() === 'no atendido';
  const feedbackValue = (data.feedback || '').trim();
  const isSystemFeedback = isSystemFeedbackText(feedbackValue);
  const visibleObservation = isSystemFeedback ? '' : feedbackValue;
  const statusInfo =
    pendingExpired || unattendedBySystem
      ? STATUS_INFO.NO_ATENDIDO
      : STATUS_INFO[licenseStatus];
  const canEditArrival =
    (!isEmployee && ['ACEPTADO', 'INACTIVO'].includes(licenseStatus)) ||
    (isEmployee && licenseStatus === 'ACTIVO');
  const canEditObservation =
    !isEmployee &&
    !data.feedback &&
    licenseStatus !== 'INACTIVO' &&
    !pendingExpired &&
    !unattendedBySystem;
  const canEmployeeEditRequest =
    isEmployee && licenseStatus === 'PROCESO' && !pendingExpired;
  const canShowAdminReviewActions =
    !isEmployee &&
    licenseStatus === 'PROCESO' &&
    !pendingExpired &&
    data.usersId !== id;
  const canShowAdminCancelAction =
    !isEmployee &&
    ['ACEPTADO', 'DENEGADO'].includes(licenseStatus) &&
    !pendingExpired &&
    !unattendedBySystem;
  const canShowAdminFinishAction = !isEmployee && licenseStatus === 'ACTIVO';

  const handleFeedback = (e: React.FocusEvent<HTMLInputElement>) => {
    setFeedback(e.target.value);
    setObservation(e.target.value);
  };
  const handleChangeStatus = (value: string) => {
    const newLicense = {
      status: value,
      feedback: data.feedback || feedback || observation,
      supervisorId: id,
    };
    axiosInstance.patch(`/license/approve/${data.id}`, newLicense).then(() => {
      onSave?.();
      socket.emit('client:action-button');
    });
  };
  const handleCancelStatus = () => {
    const previousStatus = data.status === 'ACTIVO' ? 'ACEPTADO' : 'PROCESO';
    handleChangeStatus(previousStatus);
  };
  const finishWithCurrentTime = () => {
    const checkout = new Date();
    checkout.setHours(checkout.getHours() - 5);
    axiosInstance
      .patch(`/license/checkout/${data.id}`, {
        checkout,
        fine: calculateFineState(new Date().toISOString()),
        status: 'INACTIVO',
      })
      .then(() => {
        onSave?.();
        socket.emit('client:action-button');
      });
  };
  const formatDateTimeInput = (value?: string) => {
    if (!value) return '';
    const GMT = 5 * 60 * 60 * 1000;
    const time = new Date(value);
    return new Date(time.getTime() + GMT).toISOString().slice(0, 16);
  };

  const calculateFineState = (checkout: string) => {
    if (!data.untilDate) return 'PUNTUAL';
    const GMT = 5 * 60 * 60 * 1000;
    const checkoutDate = new Date(checkout);
    const untilDate = new Date(new Date(data.untilDate).getTime() + GMT);
    const timeDifference = checkoutDate.getTime() - untilDate.getTime();
    if (timeDifference >= 20 * 60 * 1000) return 'MUY_GRAVE';
    if (timeDifference >= 15 * 60 * 1000) return 'GRAVE';
    if (timeDifference >= 10 * 60 * 1000) return 'SIMPLE';
    if (timeDifference >= 3 * 60 * 1000) return 'TARDE';
    return 'PUNTUAL';
  };

  const getArrivalStatus = () => {
    if (!data.checkout && data.fine === 'MUY_GRAVE') {
      return ARRIVAL_STATUS_INFO.NO_REGISTER;
    }
    if (!data.checkout) return null;
    const GMT = 5 * 60 * 60 * 1000;
    const checkoutDate = new Date(new Date(data.checkout).getTime() + GMT);
    const untilDate = new Date(new Date(data.untilDate).getTime() + GMT);
    if (checkoutDate.getTime() < untilDate.getTime()) {
      return ARRIVAL_STATUS_INFO.EARLY;
    }
    const status = calculateFineState(checkoutDate.toISOString());
    return ARRIVAL_STATUS_INFO[status as keyof typeof ARRIVAL_STATUS_INFO];
  };

  const handleArrivalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (!value) {
      setIsEditingArrival(false);
      return;
    }
    if (value === formatDateTimeInput(data.checkout)) return;
    const checkout = new Date(value);
    checkout.setHours(checkout.getHours() - 5);
    axiosInstance
      .patch(`/license/checkout/${data.id}`, {
        checkout,
        fine: calculateFineState(value),
        status: 'INACTIVO',
      })
      .then(() => {
        setIsEditingArrival(false);
        onSave?.();
        socket.emit('client:action-button');
      });
  };

  const handleObservationBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const nextObservation = value.trim();
    if (!nextObservation || data.feedback) return;
    axiosInstance
      .patch(`/license/approve/${data.id}`, {
        status: data.status,
        feedback: nextObservation,
        supervisorId: id,
      })
      .then(() => {
        setFeedback(nextObservation);
        setObservation(nextObservation);
        onSave?.();
        socket.emit('client:action-button');
      });
  };
  const getDate = (value: string) => {
    const GMT = 5 * 60 * 60 * 1000;
    const time = new Date(value);
    const gmtMinus5Time = new Date(time.getTime() + GMT);
    const res = formatDate(gmtMinus5Time, {
      day: '2-digit',
      weekday: 'short',
      month: '2-digit',
      // year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    return value ? res : '---';
  };
  const getDateLines = (value: string) => {
    if (!value) return ['---'];
    const GMT = 5 * 60 * 60 * 1000;
    const time = new Date(value);
    const gmtMinus5Time = new Date(time.getTime() + GMT);
    const weekday = new Intl.DateTimeFormat('es-PE', {
      weekday: 'short',
    })
      .format(gmtMinus5Time)
      .replace('.', '')
      .toUpperCase();
    const day = new Intl.DateTimeFormat('es-PE', { day: '2-digit' }).format(
      gmtMinus5Time
    );
    const month = new Intl.DateTimeFormat('es-PE', { month: '2-digit' }).format(
      gmtMinus5Time
    );
    const timeText = new Intl.DateTimeFormat('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(gmtMinus5Time)
      .replace('a. m.', 'A. M.')
      .replace('p. m.', 'P. M.');
    const [hour, ...period] = timeText.split(' ');
    return [`${weekday},`, `${day}/${month}, ${hour}`, period.join(' ')];
  };
  const renderDate = (value: string) => (
    <span className="license-date-stack" title={getDate(value)}>
      <span>{getDateLines(value).slice(0, 2).join(' ')}</span>
      <span>{getDateLines(value)[2]}</span>
    </span>
  );
  const renderArrivalLabel = (label: string) => {
    const linesByLabel: Record<string, string[]> = {
      'Llegada anticipada': ['Llegada', 'anticipada'],
      'Falta simple': ['Falta', 'simple'],
      'Falta grave': ['Falta', 'grave'],
      'Falta muy grave': ['Falta muy', 'grave'],
      'Ingreso no registrado': ['Ingreso no', 'registrado'],
    };
    const lines = linesByLabel[label] ?? [label];
    return (
      <span className="license-arrival-label">
        {lines.map(line => (
          <span key={line}>{line}</span>
        ))}
      </span>
    );
  };
  const arrivalStatus = getArrivalStatus();
  const arrivalTitle =
    data.checkout && arrivalStatus
      ? `${arrivalStatus.description}: ${getDate(data.checkout as string)}`
      : arrivalStatus
      ? arrivalStatus.description
      : 'Sin registro';
  const splitFullName = (fullName: string): NameParts => {
    const words = fullName.trim().split(/\s+/);

    if (words.length === 1) {
      return { firstName: words[0], lastName: '' };
    } else if (words.length === 2) {
      return { firstName: words[0], lastName: words[1] };
    } else {
      const firstName = words.slice(0, words.length - 2).join(' ');
      const lastName = words.slice(words.length - 2).join(' ');
      return { firstName, lastName };
    }
  };

  return (
    <>
      <div
        className={`license-item-content ${
          index % 2 !== 0 && 'license-item-bg'
        } ${isEmployee ? 'license-employee' : 'license-admin'}`}
      >
        <div
          className={`license-header-items `}
          style={{ justifyContent: 'center' }}
        >
          {index + 1}
        </div>
        {!isEmployee && (
          <div className="license-name-area" title={userName}>
            <div
              className="license-name-text"
              style={{ cursor: 'context-menu' }}
            >
              {userName}
            </div>
          </div>
        )}
        <div
          className="license-header-items"
          style={{ justifyContent: 'center' }}
          title={data.supervisorId ? supervisorName : '---'}
        >
          {data.supervisor?.profile ? (
            <DefaultUserImage
              user={{
                firstName: data.supervisor.profile.firstName,
                lastName: data.supervisor.profile.lastName,
                dni: data.supervisor.profile.dni,
              }}
            />
          ) : supervisorName ? (
            <DefaultUserImage
              user={{
                firstName: splitFullName(supervisorName).firstName,
                lastName: splitFullName(supervisorName).lastName,
                dni: `000000${data.supervisorId}`,
              }}
            />
          ) : (
            '---'
          )}
        </div>
        {isEmployee && (
          <>
            <div className="license-header-items">
              <span
                title={
                  data.type === 'SALIDA'
                    ? 'Salida de campo'
                    : 'Licencia personal'
                }
              >
                {data.type === 'SALIDA' ? 'S' : 'L'}
              </span>
            </div>
            <div
              className="license-header-items"
              style={{ justifyContent: 'center' }}
            >
              {formatDate(new Date(data.createdAt))}
            </div>
          </>
        )}
        <div className="license-header-items" title={reasonInfo.motivo}>
          {reasonInfo.motivo}
        </div>
        <div className="license-header-items" title={reasonInfo.description}>
          {reasonInfo.description}
        </div>
        <div className="license-header-items">
          <span
            className={`card-status-message license-status ${
              statusInfo?.className ?? ''
            }`}
          >
            {statusInfo?.label ?? licenseStatus.toLowerCase()}
          </span>
        </div>
        <div className="license-item-date">{renderDate(data.startDate)}</div>
        <div className="license-item-date">{renderDate(data.untilDate)}</div>
        <div
          className="license-item-date license-arrival-cell"
          title={arrivalTitle}
        >
          {canEditArrival && isEditingArrival ? (
            <input
              className="license-arrival-input"
              type="datetime-local"
              title="Registrar llegada"
              value={arrivalValue || formatDateTimeInput(data.checkout)}
              onChange={e => setArrivalValue(e.target.value)}
              onBlur={handleArrivalBlur}
            />
          ) : canEditArrival && arrivalStatus ? (
            <span
              className={`license-arrival-chip ${arrivalStatus.className}`}
              title={arrivalTitle}
            >
              {renderArrivalLabel(arrivalStatus.label)}
            </span>
          ) : canEditArrival ? (
            <button
              className="license-arrival-empty"
              type="button"
              title="Registrar llegada"
              onClick={() => setIsEditingArrival(true)}
            >
              Sin registro
            </button>
          ) : arrivalStatus ? (
            <span
              className={`license-arrival-chip ${arrivalStatus.className}`}
              title={arrivalTitle}
            >
              {renderArrivalLabel(arrivalStatus.label)}
            </span>
          ) : (
            'Sin registro'
          )}
        </div>
        {canEditObservation ? (
          <div className="license-item-input">
            <input
              value={observation}
              title="Observacion"
              onChange={e => {
                setFeedback(e.target.value);
                setObservation(e.target.value);
              }}
              onBlur={
                data.status === 'PROCESO'
                  ? handleFeedback
                  : handleObservationBlur
              }
              className="license-item-text"
            />
          </div>
        ) : (
          <div className="license-item-input" title={visibleObservation}>
            {visibleObservation}
          </div>
        )}
        <div className="license-header-btns">
          {hasMultipleDates && (
            <button
              type="button"
              className="license-btn-action license-btn-detail"
              title="Mostrar u ocultar fechas y horarios de esta solicitud"
              onClick={() => setShowMultipleDates(value => !value)}
            >
              {showMultipleDates ? 'Ocultar fechas' : 'Ver fechas'}
            </button>
          )}
          {canShowAdminReviewActions && (
            <>
              <button
                onClick={() => handleChangeStatus('ACEPTADO')}
                className="license-btn-action license-btn-approve"
                title="Aprobar esta solicitud"
                type="button"
              >
                <img
                  src="/svg/check-blue.svg"
                  className="license-btn-action-icon"
                />
                Aprobar
              </button>
              <button
                onClick={() => handleChangeStatus('DENEGADO')}
                className="license-btn-action license-btn-reject"
                title="Rechazar esta solicitud"
                type="button"
              >
                <img
                  src="/svg/cross-red.svg"
                  className="license-btn-action-icon"
                />
                Rechazar
              </button>
            </>
          )}
          {canShowAdminCancelAction && (
            <button
              onClick={handleCancelStatus}
              className="license-btn-action license-btn-cancel"
              title="Cancelar la decision y volver al estado anterior"
            >
              Cancelar
            </button>
          )}
          {canShowAdminFinishAction && (
            <button
              onClick={finishWithCurrentTime}
              className="license-btn-action license-btn-finish"
              title="Registrar llegada con la fecha y hora actual"
            >
              Finalizar
            </button>
          )}
          {canEmployeeEditRequest && (
            <div className="col-span actions-container">
              <Button
                icon="pencil"
                className="license-btn-edit"
                imageStyle="license-btn-edit-img"
                onClick={editData}
                title="Editar solicitud"
              />
              <ButtonDelete
                icon="trash"
                className="license-btn-delete"
                imageStyle="license-btn-delete-img"
                onSave={() => {
                  onSave?.();
                  socket.emit('client:action-button');
                }}
                url={`/license/${data.id}`}
                passwordRequired
                title="Eliminar solicitud"
              />
            </div>
          )}
        </div>
      </div>
      {hasMultipleDates && showMultipleDates && (
        <div
          className={`license-multiple-detail ${
            index % 2 !== 0 && 'license-item-bg'
          }`}
        >
          <div className="license-multiple-panel">
            <div className="license-multiple-title">
              <strong>Fechas solicitadas</strong>
              <span>{multipleDates.length} fechas</span>
            </div>
            <div className="license-multiple-grid license-multiple-head">
              <span>Item</span>
              <span>Salida</span>
              <span>Retorno</span>
              <span>Estado</span>
            </div>
            {multipleDates.map((item, itemIndex) => {
              const itemStatus = getMultipleDateStatus(item);
              return (
                <div
                  className={`license-multiple-grid license-multiple-row ${itemStatus.className}`}
                  key={`${item.startDate}-${itemIndex}`}
                >
                  <span>{itemIndex + 1}</span>
                  <span title={getDate(item.startDate)}>
                    {renderDate(item.startDate)}
                  </span>
                  <span title={getDate(item.untilDate)}>
                    {renderDate(item.untilDate)}
                  </span>
                  <span>
                    <strong className="license-multiple-status">
                      {itemStatus.label}
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
