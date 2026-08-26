import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  CheckCircle2,
  ClipboardPenLine,
  Fingerprint,
  LockKeyhole,
  Radio,
} from 'lucide-react';
import Input from '@/components/Input/Input';
import Button from '@/components/button/Button';
import { AppButton } from '@/components/app-ui/app-button';
import './Attendance.css';
import { _date } from '@/utils/formatDate';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { SocketContext } from '@/context/SocketContex';
import { isOpenCardViewPdf$ } from '@/services/sharingSubject';
import { generateReportDaily } from './excelGenerator/GenerateReportDaily';
import { generateReportRange } from './excelGenerator/GenerateReportRange';
import { AttendanceList } from './components/attendanceList/AttendanceList';
import { AttendanceActiveListDialog } from './components/AttendanceActiveListDialog';
import { AttendanceAddListButton } from './components/AttendanceAddListButton';
import { AttendanceCreateDialog } from './components/AttendanceCreateDialog';
import { AttendanceDiscardDialog } from './components/AttendanceDiscardDialog';
import { AttendanceLifecycleStrip } from './components/AttendanceLifecycleStrip';
import { CardViewPdf } from './components/cardViewPdf/CardViewPdf';
import Legend from './components/legend/Legend';
import { CALLS } from './models/definitionsAttendance';
import usePendingAttendance from './hooks/usePendingAttendance';
import type {
  AttendanceCaptureMode,
  AttendanceList as AttendanceListRecord,
  AttendanceListState,
} from './attendance.types';
import { attendanceService } from './services';
import { openDialog, type DialogHandle } from '@/utils/dialog';
import type { AttendanceStatus } from '@/models/attendanceStatus';
import { useAttendanceBatchEditor } from './hooks/useAttendanceBatchEditor';
import { AttendanceCorrectionReasonDialog } from './components/AttendanceCorrectionReasonDialog';
import { useQueryClient } from '@tanstack/react-query';
import useAttendanceLists, {
  attendanceListsQueryKey,
} from './hooks/useAttendanceLists';
import { pendingAttendanceQueryKey } from './hooks/usePendingAttendance';
import { ATTENDANCE_REALTIME_EVENTS } from './attendanceRealtime';

interface RangeDate {
  startDate: string;
  endDate: string;
}

const today = new Date();
const todayDate = _date(today);

const BIOMETRIC_STATE_COPY: Record<
  AttendanceListState,
  { eyebrow: string; title: string; detail: string; icon: ReactNode }
> = {
  OPEN: {
    eyebrow: 'Captura en curso',
    title: 'Esperando huellas',
    detail:
      'Las filas se actualizan en vivo. La edición manual permanece bloqueada.',
    icon: <Radio size={19} />,
  },
  REVIEW: {
    eyebrow: 'Captura cerrada',
    title: 'Revisión manual',
    detail:
      'El equipo ya no modifica esta lista. Las correcciones se guardan automáticamente.',
    icon: <LockKeyhole size={19} />,
  },
  FINALIZED: {
    eyebrow: 'Lista definitiva',
    title: 'Asistencia guardada',
    detail: 'Esta lista ya participa en reportes, incidencias y planilla.',
    icon: <CheckCircle2 size={19} />,
  },
};

const MANUAL_STATE_COPY: Record<
  AttendanceListState,
  { eyebrow: string; title: string; detail: string; icon: ReactNode }
> = {
  OPEN: {
    eyebrow: 'Registro manual',
    title: 'Lista en edición',
    detail:
      'Los cambios se guardan automáticamente. Finalice cuando termine la revisión.',
    icon: <ClipboardPenLine size={19} />,
  },
  REVIEW: {
    eyebrow: 'Registro manual',
    title: 'Revisión pendiente',
    detail: 'Revise los estados antes de guardar la lista.',
    icon: <LockKeyhole size={19} />,
  },
  FINALIZED: {
    eyebrow: 'Lista definitiva',
    title: 'Asistencia guardada',
    detail: 'Esta lista ya participa en reportes, incidencias y planilla.',
    icon: <CheckCircle2 size={19} />,
  },
};

export const Attendance = () => {
  const [date, setDate] = useState(todayDate);
  const [selectedListId, setSelectedListId] = useState<
    number | null | undefined
  >(undefined);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isChangingSelection, setIsChangingSelection] = useState(false);
  const queryClient = useQueryClient();
  const attendanceListsQuery = useAttendanceLists(date);
  const pendingAttendanceQuery = usePendingAttendance();
  const callLists = attendanceListsQuery.data;
  const resolvedSelectedListId =
    selectedListId === undefined
      ? callLists?.[callLists.length - 1]?.id ?? null
      : selectedListId;
  const callList = useMemo(
    () => callLists?.find(list => list.id === resolvedSelectedListId) ?? null,
    [callLists, resolvedSelectedListId]
  );
  const [rangeDate, setRangeDate] = useState<RangeDate>({
    startDate: '',
    endDate: '',
  });

  const socket = useContext(SocketContext);

  const applyCanonicalBatch = useCallback(
    (response: Awaited<ReturnType<typeof attendanceService.updateBatch>>) => {
      const canonicalByUser = new Map(
        response.participants.map(participant => [
          participant.userId,
          participant,
        ])
      );
      const applyToList = (list: AttendanceListRecord) =>
        list.id !== response.listId
          ? list
          : {
              ...list,
              users: list.users.map(participant => {
                const canonical = canonicalByUser.get(participant.usersId);
                return canonical
                  ? {
                      ...participant,
                      status: canonical.status,
                      statusSource: canonical.statusSource,
                      biometricMarkedAt: canonical.biometricMarkedAt,
                    }
                  : participant;
              }),
            };
      queryClient.setQueryData<AttendanceListRecord[]>(
        attendanceListsQueryKey(date),
        current => current?.map(applyToList)
      );
    },
    [date, queryClient]
  );

  const handleBatchError = useCallback(() => {
    SnackbarUtilities.error(
      'No se guardaron los cambios. Se restauraron los últimos estados confirmados.'
    );
  }, []);

  const batchEditor = useAttendanceBatchEditor({
    listId: callList?.id ?? null,
    confirmedParticipants: callList?.users ?? [],
    onConfirmed: applyCanonicalBatch,
    onError: handleBatchError,
  });

  useEffect(() => {
    const refreshAttendance = () => {
      void queryClient.invalidateQueries({
        queryKey: attendanceListsQueryKey(date),
      });
      void queryClient.invalidateQueries({
        queryKey: pendingAttendanceQueryKey,
      });
    };
    ATTENDANCE_REALTIME_EVENTS.forEach(event => {
      socket.on(event, refreshAttendance);
    });
    socket.on('connect', refreshAttendance);

    return () => {
      ATTENDANCE_REALTIME_EVENTS.forEach(event => {
        socket.off(event, refreshAttendance);
      });
      socket.off('connect', refreshAttendance);
    };
  }, [date, queryClient, socket]);

  const handleRadioChange = (status: AttendanceStatus, usersId: number) => {
    const participant = callList?.users.find(item => item.usersId === usersId);
    if (!participant || participant.status === status) {
      batchEditor.queueChange(usersId, status);
      return;
    }
    if (participant.statusSource !== 'BIOMETRIC') {
      batchEditor.queueChange(usersId, status);
      return;
    }

    const profile = participant.user.profile;
    const userName = profile
      ? `${profile.lastName} ${profile.firstName}`.trim()
      : participant.user.email;
    let dialogHandle: DialogHandle | null = null;
    dialogHandle = openDialog({
      title: 'Justificar corrección de huella',
      description:
        'El motivo quedará registrado en la auditoría de asistencia.',
      width: '32rem',
      children: (
        <AttendanceCorrectionReasonDialog
          getDialogHandle={() => dialogHandle}
          userName={userName}
          onConfirm={reason => batchEditor.queueChange(usersId, status, reason)}
        />
      ),
    });
  };

  const addCall = async (captureMode: AttendanceCaptureMode) => {
    const now = new Date();
    const hour = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const currentDate = _date(now);
    const currentLists = await attendanceService.getLists(currentDate);
    if (!(CALLS.length > currentLists.length)) {
      SnackbarUtilities.error('Ya no se pueden crear más llamados este día.');
      return false;
    }

    const title = CALLS[currentLists.length];
    const response = await attendanceService.create({
      ...title,
      timer: hour,
      captureMode,
    });
    setSelectedListId(response.id);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: attendanceListsQueryKey(currentDate),
      }),
      queryClient.invalidateQueries({ queryKey: pendingAttendanceQueryKey }),
    ]);
    return true;
  };

  const closeBiometricAttendance = async () => {
    if (!callList) return;
    await attendanceService.closeBiometric(callList.id);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: attendanceListsQueryKey(date),
      }),
      queryClient.invalidateQueries({ queryKey: pendingAttendanceQueryKey }),
    ]);
  };

  const finalizeAttendance = async () => {
    if (!callList) return;
    setIsFinalizing(true);
    try {
      const flushed = await batchEditor.flush();
      if (!flushed) return;
      await attendanceService.finalize(callList.id);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: attendanceListsQueryKey(date),
        }),
        queryClient.invalidateQueries({ queryKey: pendingAttendanceQueryKey }),
      ]);
      SnackbarUtilities.success('Lista finalizada.');
    } catch {
      SnackbarUtilities.error('No se pudo finalizar la lista.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const discardAttendance = async (listId: number) => {
    batchEditor.reset();
    await attendanceService.discard(listId);
    setSelectedListId(null);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: attendanceListsQueryKey(date),
      }),
      queryClient.invalidateQueries({ queryKey: pendingAttendanceQueryKey }),
    ]);
    SnackbarUtilities.success(
      'Lista descartada. Puede crear un nuevo llamado.'
    );
  };

  const confirmDiscardAttendance = () => {
    if (!callList) return;
    const listId = callList.id;
    const listLabel = `${callList.title || 'Lista de asistencia'} · ${
      callList.timer || 'sin hora'
    }`;
    let dialogHandle: DialogHandle | null = null;

    dialogHandle = openDialog({
      title: 'Descartar lista',
      description:
        'Use esta acción si la lista en curso no debe formar parte de la asistencia.',
      width: '30rem',
      children: (
        <AttendanceDiscardDialog
          getDialogHandle={() => dialogHandle}
          listLabel={listLabel}
          onDiscard={() => discardAttendance(listId)}
        />
      ),
    });
  };

  const changeSelection = async (next: {
    date: string;
    listId: number | null;
  }) => {
    if (isChangingSelection || isFinalizing) return;
    setIsChangingSelection(true);
    try {
      const flushed = await batchEditor.flush();
      if (!flushed) return;
      setDate(next.date);
      setSelectedListId(next.listId);
    } finally {
      setIsChangingSelection(false);
    }
  };

  const getDate = (event: ChangeEvent<HTMLInputElement>) => {
    void changeSelection({ date: event.target.value, listId: null });
  };

  const showAttendanceUsers = (data: AttendanceListRecord) => {
    if (data.id === callList?.id) return;
    void changeSelection({ date, listId: data.id });
  };

  const getSelectedStatus = (usersId: number) => {
    if (callList?.state === 'FINALIZED') return null;
    return batchEditor.pendingChanges[usersId]?.status ?? null;
  };

  const pendingAttendance = pendingAttendanceQuery.data;
  const pendingAttendanceDate = pendingAttendance
    ? _date(new Date(pendingAttendance.createdAt))
    : null;
  const hasPendingAttendanceOnSelectedDate =
    Boolean(
      callLists?.some(list => list.state === 'OPEN' || list.state === 'REVIEW')
    ) || pendingAttendanceDate === date;
  const hasPendingAttendanceOnAnotherDate = Boolean(
    pendingAttendance && pendingAttendanceDate !== date
  );
  const isPendingAttendanceLoading = pendingAttendanceQuery.isPending;
  const todayVerify = date === todayDate;
  const isBiometric = callList?.captureMode === 'BIOMETRIC';
  const isManualOpen =
    callList?.captureMode === 'MANUAL' && callList.state === 'OPEN';
  const isBiometricOpen = isBiometric && callList.state === 'OPEN';
  const isBiometricReview = isBiometric && callList.state === 'REVIEW';
  const isListEditable = isManualOpen || isBiometricReview;
  const isMutationPending =
    batchEditor.isSaving || isFinalizing || isChangingSelection;
  const canShowAddList =
    Boolean(callLists && callLists.length < CALLS.length) && todayVerify;
  const isAddListDisabled =
    hasPendingAttendanceOnSelectedDate || isPendingAttendanceLoading;
  const addListDisabledReason = isPendingAttendanceLoading
    ? 'Comprobando si existe una lista en curso.'
    : hasPendingAttendanceOnSelectedDate
    ? 'Guarde o descarte la lista en curso para crear otra.'
    : null;
  const stateCopy = callList
    ? callList.captureMode === 'BIOMETRIC'
      ? BIOMETRIC_STATE_COPY[callList.state]
      : MANUAL_STATE_COPY[callList.state]
    : null;

  const openCreateAttendanceDialog = () => {
    if (!callLists || !canShowAddList) return;
    if (
      hasPendingAttendanceOnAnotherDate &&
      pendingAttendance &&
      pendingAttendanceDate
    ) {
      let dialogHandle: DialogHandle | null = null;
      dialogHandle = openDialog({
        title: 'Lista de asistencia activa',
        description:
          'Existe una lista activa de una fecha anterior. Ve a ella para finalizarla o descartarla antes de crear una nueva.',
        width: '30rem',
        children: (
          <AttendanceActiveListDialog
            getDialogHandle={() => dialogHandle}
            onGoToActiveList={() =>
              void changeSelection({
                date: pendingAttendanceDate,
                listId: pendingAttendance.id,
              })
            }
          />
        ),
      });
      return;
    }
    if (isAddListDisabled) return;
    const nextCall = CALLS[callLists.length];
    if (!nextCall) return;

    let dialogHandle: DialogHandle | null = null;
    dialogHandle = openDialog({
      title: `Crear ${nextCall.title}`,
      description: 'Elige cómo registrarás la asistencia de este llamado.',
      width: '34rem',
      children: (
        <AttendanceCreateDialog
          getDialogHandle={() => dialogHandle}
          onCreate={addCall}
        />
      ),
    });
  };
  const reportsDisabled =
    !callList || callList.users.length === 0 || callList.state !== 'FINALIZED';

  const genarteReportRange = async (type: 'pdf' | 'excel') => {
    const { endDate, startDate } = rangeDate;
    if (!endDate && !startDate) {
      return SnackbarUtilities.error('Ingresar rangos de fecha');
    }
    const newData = await attendanceService.getRange(startDate, endDate);
    if (type === 'pdf') {
      isOpenCardViewPdf$.setSubject = {
        isOpen: true,
        data: newData,
        rangeDate: { startDate, endDate },
        typeReport: 'range',
      };
      return;
    }
    generateReportRange({ startDate, endDate, printData: newData });
  };

  const reportDaily = async (type: 'pdf' | 'excel', position?: number) => {
    const newData = await attendanceService.getRange(date, date);
    if (type === 'pdf') {
      isOpenCardViewPdf$.setSubject = {
        isOpen: true,
        data: newData,
        daily: date,
        position,
        typeReport: 'daily',
      };
      return;
    }
    generateReportDaily({ startDate: date, printData: newData });
  };

  const handleRangeData = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setRangeDate(current => ({ ...current, [name]: value }));
  };

  return (
    <div className="attendance">
      <div className="attendance-content">
        <span className="attendance-date">
          <img
            src="/svg/calendary-icon.svg"
            className="attendance-icon"
            alt=""
          />
          <Input
            type="date"
            onChange={getDate}
            width={12}
            max={todayDate}
            value={date}
          />
          <div className="attendance-call-container">
            {callLists?.map(data => (
              <div
                className={`attendance-call-status attendance-call-status--${data.state.toLowerCase()}`}
                onClick={() => showAttendanceUsers(data)}
                key={data.id}
                title={
                  data.captureMode === 'BIOMETRIC'
                    ? `Huella · ${data.state}`
                    : 'Lista manual'
                }
              >
                <img
                  src={`/svg/${
                    data.state !== 'FINALIZED'
                      ? 'arrow-pressed'
                      : callList?.id !== data.id
                      ? 'arrow-gray'
                      : 'arrow-border'
                  }.svg`}
                  className="attendance-img"
                  alt=""
                />
                <p className="attendance-text">
                  {data.captureMode === 'BIOMETRIC' && (
                    <Fingerprint size={11} />
                  )}
                  {data.timer}
                </p>
              </div>
            ))}
          </div>
          {canShowAddList ? (
            <AttendanceAddListButton
              disabled={isAddListDisabled}
              disabledReason={addListDisabledReason}
              onClick={openCreateAttendanceDialog}
            />
          ) : null}
        </span>

        {callList && (
          <div className="attendance-card-container-main">
            <div className="attendance-card-container-list">
              {stateCopy && (
                <AttendanceLifecycleStrip
                  state={callList.state}
                  icon={stateCopy.icon}
                  eyebrow={stateCopy.eyebrow}
                  title={stateCopy.title}
                  detail={stateCopy.detail}
                  actions={
                    isManualOpen || isBiometricOpen || isBiometricReview ? (
                      <>
                        <AppButton
                          variant="danger"
                          className="h-8 text-xs"
                          onClick={confirmDiscardAttendance}
                          disabled={isMutationPending}
                        >
                          Descartar lista
                        </AppButton>
                        <AppButton
                          className="h-8 text-xs"
                          onClick={
                            isBiometricOpen
                              ? closeBiometricAttendance
                              : finalizeAttendance
                          }
                          disabled={isMutationPending}
                        >
                          {isBiometricOpen
                            ? 'Cerrar captura'
                            : 'Finalizar lista'}
                        </AppButton>
                      </>
                    ) : null
                  }
                />
              )}

              <div className="attendance-card-container">
                <div className="attendance-header">
                  <div className="attendance-list-text hide-field">ITEM</div>
                  <div className="attendance-list-text hide-field">CUARTOS</div>
                  <div className="attendance-list-text">APELLIDO Y NOMBRE</div>
                  <div className="attendance-list-text hide-field">DNI</div>
                  <div
                    className="attendance-list-text hide-field"
                    style={
                      isBiometric ? { justifyContent: 'center' } : undefined
                    }
                  >
                    {isBiometric ? 'MARCACIÓN' : 'CELULAR'}
                  </div>
                  <div className="attendance-list-text attendance-config head-p">
                    P
                  </div>
                  <div className="attendance-list-text attendance-config head-t">
                    T
                  </div>
                  <div className="attendance-list-text attendance-config head-f">
                    F
                  </div>
                  <div className="attendance-list-text attendance-config head-g">
                    G
                  </div>
                  <div className="attendance-list-text attendance-config head-m">
                    M
                  </div>
                  <div className="attendance-list-text attendance-config head-l">
                    L
                  </div>
                  <div className="attendance-list-text attendance-config head-s">
                    S
                  </div>
                </div>
                {callList.users.map((participant, index) => (
                  <AttendanceList
                    key={participant.usersId}
                    onRadioChange={handleRadioChange}
                    participant={participant}
                    captureMode={callList.captureMode}
                    listState={callList.state}
                    selectedStatus={getSelectedStatus(participant.usersId)}
                    index={index}
                    disabled={!isListEditable || isMutationPending}
                  />
                ))}
              </div>
            </div>

            <div className="attendance-info-area">
              <Legend />
              <div className="attendance-report-container">
                <div className="attendance-reports">
                  <label className="attendance-labels">
                    Generar asistencia actual
                  </label>
                  <div className="attendace-btns">
                    <Button
                      icon="report-pdf-icon"
                      text="Vista Previa"
                      color="secondary"
                      onClick={() => reportDaily('pdf', callList.position)}
                      disabled={reportsDisabled}
                      variant="outline"
                      full
                    />
                    <Button
                      text="Descargar Excel"
                      icon="report-excel-icon"
                      onClick={() => reportDaily('excel')}
                      color="secondary"
                      variant="outline"
                      disabled={reportsDisabled}
                      full
                    />
                  </div>
                </div>
                <div className="attendance-reports">
                  <label className="attendance-labels">
                    Reporte de asistencia
                  </label>
                  <div className="attendace-btns">
                    <Input
                      label="Fecha inicio"
                      type="date"
                      name="startDate"
                      onChange={handleRangeData}
                      width={12}
                      max={todayDate}
                      required
                    />
                    <Input
                      label="Fecha fin"
                      type="date"
                      name="endDate"
                      onChange={handleRangeData}
                      width={12}
                      max={todayDate}
                      required
                    />
                  </div>
                  <div className="attendace-btns">
                    <Button
                      text="Vista Previa"
                      onClick={() => genarteReportRange('pdf')}
                      icon="report-pdf-icon"
                      color="secondary"
                      variant="outline"
                      borderRadius={3}
                      full
                    />
                    <Button
                      text="Reporte en Excel"
                      onClick={() => genarteReportRange('excel')}
                      icon="report-excel-icon"
                      color="secondary"
                      variant="outline"
                      borderRadius={3}
                      full
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!callList && callLists && callLists.length > 0 && (
          <div className="attendance-list-empty">
            <h1>Seleccione una Lista</h1>
          </div>
        )}
        <CardViewPdf />
      </div>
    </div>
  );
};
