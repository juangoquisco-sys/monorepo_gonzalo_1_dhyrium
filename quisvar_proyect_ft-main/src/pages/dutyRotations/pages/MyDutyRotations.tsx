import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock,
  FileImage,
  Send,
  ShieldCheck,
} from 'lucide-react';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import DutyRotationsPageHeader from '../components/DutyRotationsPageHeader';
import HelpTooltip from '../components/HelpTooltip';
import {
  ATTENDANCE_RECONCILIATION_CAPABILITY,
  dutyAssignmentStatusLabels,
} from '../dutyRotations.constants';
import { DutyRotationContractError } from '../dutyRotations.contract';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../dutyRotations.queries';
import {
  formatDutyDateInput,
  formatDutyAssignmentDays,
  formatDutyAssignmentPeriod,
  formatDutyDisplayDate,
  getDutyParticipantUsers,
  getDutyUserFullName,
  sortDutyAssignmentsByDate,
} from '../dutyRotations.utils';
import useDutyAssignmentDialog from '../hooks/useDutyAssignmentDialog';
import type {
  DutyRotationAssignment,
  DutySwapRequest,
} from '../models/dutyRotations.types';
import {
  claimOpenPoolDuty,
  getMyDutyEntitlements,
  getMyUpcomingDutyAssignments,
  getOpenPoolDutyRequests,
  openDutyAssignmentEvidence,
} from '../services/dutyRotations.service';
import '../dutyRotations.css';

const MyDutyRotations = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sessionUserId = useSelector((state: RootState) => state.userSession.id);
  const assignmentDialog = useDutyAssignmentDialog();

  const myUpcomingQuery = useQuery({
    queryKey: dutyRotationQueryKeys.myUpcoming,
    queryFn: getMyUpcomingDutyAssignments,
  });
  const myEntitlementsQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.myEntitlements,
      ATTENDANCE_RECONCILIATION_CAPABILITY,
    ],
    queryFn: () => getMyDutyEntitlements(ATTENDANCE_RECONCILIATION_CAPABILITY),
  });
  const openPoolQuery = useQuery({
    queryKey: dutyRotationQueryKeys.openPool,
    queryFn: getOpenPoolDutyRequests,
  });

  const myUpcomingAssignments = useMemo(
    () => myUpcomingQuery.data ?? [],
    [myUpcomingQuery.data]
  );
  const actionableAssignments = useMemo(
    () =>
      myUpcomingAssignments.filter(assignment =>
        ['PENDING', 'OPEN_POOL'].includes(assignment.status)
      ),
    [myUpcomingAssignments]
  );
  const myOpenEntitlements = useMemo(
    () => myEntitlementsQuery.data ?? [],
    [myEntitlementsQuery.data]
  );
  const availableTurnRequests = useMemo(
    () => openPoolQuery.data ?? [],
    [openPoolQuery.data]
  );
  const nextPersonalTurn = actionableAssignments[0];
  const today = formatDutyDateInput(new Date());

  const invalidateRotations = () => refetchDutyRotations(queryClient);

  const updateClaimedDutyInCache = (
    claimedAssignment: DutyRotationAssignment,
    swapRequestId: string
  ) => {
    queryClient.setQueryData<DutySwapRequest[]>(
      dutyRotationQueryKeys.openPool,
      currentRequests =>
        currentRequests?.filter(request => request.id !== swapRequestId) ?? []
    );

    queryClient.setQueryData<DutyRotationAssignment[]>(
      dutyRotationQueryKeys.myUpcoming,
      currentAssignments => {
        const nextAssignments = (currentAssignments ?? []).filter(
          assignment => assignment.id !== claimedAssignment.id
        );
        return sortDutyAssignmentsByDate([
          ...nextAssignments,
          claimedAssignment,
        ]);
      }
    );

    queryClient.setQueryData<DutyRotationAssignment[]>(
      dutyRotationQueryKeys.assignments,
      currentAssignments =>
        currentAssignments?.map(assignment =>
          assignment.id === claimedAssignment.id
            ? claimedAssignment
            : assignment
        ) ?? []
    );
  };

  const movePoolRequestToMyUpcomingCache = (swapRequestId: string) => {
    const currentRequests =
      queryClient.getQueryData<DutySwapRequest[]>(
        dutyRotationQueryKeys.openPool
      ) ?? [];
    const requestToClaim = currentRequests.find(
      request => request.id === swapRequestId
    );

    queryClient.setQueryData<DutySwapRequest[]>(
      dutyRotationQueryKeys.openPool,
      currentPoolRequests =>
        currentPoolRequests?.filter(request => request.id !== swapRequestId) ??
        []
    );

    if (!requestToClaim?.assignment) return;

    const sessionUser = getDutyParticipantUsers(
      requestToClaim.assignment.duty
    ).find(user => user.id === sessionUserId);
    const optimisticAssignment: DutyRotationAssignment = {
      ...requestToClaim.assignment,
      assignedUserId: sessionUserId,
      assignedUser: sessionUser
        ? {
            id: sessionUser.id,
            email: sessionUser.email,
            profile: sessionUser.profile,
          }
        : requestToClaim.assignment.assignedUser,
      status: 'PENDING',
    };

    queryClient.setQueryData<DutyRotationAssignment[]>(
      dutyRotationQueryKeys.myUpcoming,
      currentAssignments => {
        const nextAssignments = (currentAssignments ?? []).filter(
          assignment => assignment.id !== optimisticAssignment.id
        );
        return sortDutyAssignmentsByDate([
          ...nextAssignments,
          optimisticAssignment,
        ]);
      }
    );
  };

  const claimMutation = useMutation({
    mutationFn: claimOpenPoolDuty,
    onMutate: async swapRequestId => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: dutyRotationQueryKeys.myUpcoming,
        }),
        queryClient.cancelQueries({ queryKey: dutyRotationQueryKeys.openPool }),
      ]);

      const previousMyUpcoming = queryClient.getQueryData<
        DutyRotationAssignment[]
      >(dutyRotationQueryKeys.myUpcoming);
      const previousOpenPool = queryClient.getQueryData<DutySwapRequest[]>(
        dutyRotationQueryKeys.openPool
      );

      movePoolRequestToMyUpcomingCache(swapRequestId);
      return { previousMyUpcoming, previousOpenPool };
    },
    onError: (error, _swapRequestId, context) => {
      queryClient.setQueryData(
        dutyRotationQueryKeys.myUpcoming,
        context?.previousMyUpcoming
      );
      queryClient.setQueryData(
        dutyRotationQueryKeys.openPool,
        context?.previousOpenPool
      );
      if (error instanceof DutyRotationContractError) {
        SnackbarUtilities.error(error.message);
      }
    },
    onSuccess: (claimedAssignment, swapRequestId) => {
      updateClaimedDutyInCache(claimedAssignment, swapRequestId);
      SnackbarUtilities.success('Turno reclamado');
    },
    onSettled: async () => {
      await invalidateRotations();
    },
  });

  const openAttendanceRepair = (assignmentId?: string) => {
    navigate(
      `/rotaciones/reparacion-asistencia${
        assignmentId ? `?assignmentId=${assignmentId}` : ''
      }`
    );
  };

  const renderDutyActions = (assignment: DutyRotationAssignment) => {
    const pendingDirectedRequest = assignment.swapRequests.find(
      request => request.status === 'PENDING' && request.targetUserId !== null
    );
    const isFuture = today < assignment.periodStart;
    const isExpired = today > assignment.dueOn;
    const isCompleted = assignment.status === 'COMPLETED';
    const isOpenPool = assignment.status === 'OPEN_POOL';
    const isNoShow = assignment.status === 'NO_SHOW';
    const completionHelpId = `duty-completion-help-${assignment.id}`;

    if (isOpenPool) {
      return (
        <div
          className="dutyRotations-cardStateMessage is-pending"
          role="status"
        >
          <Send aria-hidden="true" />
          <span>Esperando que otro participante tome el turno.</span>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div
          className="dutyRotations-cardStateMessage is-success"
          role="status"
        >
          <ShieldCheck aria-hidden="true" />
          <span>Este turno ya fue completado.</span>
        </div>
      );
    }

    if (isNoShow || isExpired) {
      return (
        <div
          className="dutyRotations-cardStateMessage is-expired"
          role="status"
        >
          <Clock aria-hidden="true" />
          <span>
            El plazo para gestionar este turno terminó el{' '}
            {formatDutyDisplayDate(assignment.dueOn)}.
          </span>
        </div>
      );
    }

    if (assignment.status !== 'PENDING') return null;

    return (
      <>
        <div className="dutyRotations-cardActions">
          {assignment.duty.capabilityKey ===
          ATTENDANCE_RECONCILIATION_CAPABILITY ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAttendanceRepair(assignment.id)}
            >
              Corregir faltas
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={isFuture}
            aria-describedby={isFuture ? completionHelpId : undefined}
            onClick={() => assignmentDialog.openCompleteAssignment(assignment)}
          >
            Completar turno
          </Button>
          {pendingDirectedRequest ? null : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => assignmentDialog.openSwapAssignment(assignment)}
            >
              Solicitar cambio
            </Button>
          )}
        </div>

        {isFuture ? (
          <div
            className="dutyRotations-cardStateMessage is-info"
            id={completionHelpId}
            role="status"
          >
            <CalendarClock aria-hidden="true" />
            <span>
              Podrás completar este turno desde el{' '}
              {formatDutyDisplayDate(assignment.periodStart)}.
            </span>
          </div>
        ) : null}

        {pendingDirectedRequest ? (
          <div
            className="dutyRotations-cardStateMessage is-pending"
            role="status"
          >
            <Clock aria-hidden="true" />
            <span>
              Cambio propuesto a{' '}
              {getDutyUserFullName(pendingDirectedRequest.targetUser)};
              pendiente de aprobación administrativa.
            </span>
          </div>
        ) : null}
      </>
    );
  };

  const renderDutyCard = (assignment: DutyRotationAssignment) => {
    const periodDaysLabel = formatDutyAssignmentDays(assignment);

    return (
      <article className="dutyRotations-shiftCard" key={assignment.id}>
        <div className="dutyRotations-shiftInfo">
          <div className="dutyRotations-shiftTitleRow">
            <h3>{assignment.duty.name}</h3>
            <span
              className={`dutyRotations-status dutyRotations-status-${assignment.status}`}
            >
              {dutyAssignmentStatusLabels[assignment.status]}
            </span>
          </div>
          <div className="dutyRotations-metaLine">
            <span>
              <CalendarRange />
              Periodo: {formatDutyAssignmentPeriod(assignment)}
            </span>
            <span>
              <Clock />
              {assignment.slotLabel}
            </span>
            {periodDaysLabel ? (
              <span>
                <CalendarDays />
                Días comprendidos: {periodDaysLabel}
              </span>
            ) : null}
            <span>
              <CalendarClock />
              Vence: {formatDutyDisplayDate(assignment.dueOn)}
            </span>
          </div>
        </div>
        {renderDutyActions(assignment)}
        {assignment.evidences.length > 0 && (
          <div className="dutyRotations-cardActions">
            {assignment.evidences.map((evidence, index) => (
              <Button
                key={evidence.id}
                size="sm"
                variant="outline"
                onClick={() =>
                  void openDutyAssignmentEvidence(evidence.contentUrl).catch(
                    () =>
                      SnackbarUtilities.error('No se pudo abrir la evidencia.')
                  )
                }
              >
                <FileImage size={14} /> Evidencia {index + 1}
              </Button>
            ))}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="dutyRotations">
      <DutyRotationsPageHeader
        description="Revisa tus turnos asignados, accesos habilitados y turnos disponibles para tomar."
        refreshing={myUpcomingQuery.isFetching || openPoolQuery.isFetching}
        onRefresh={invalidateRotations}
      />

      <div className="dutyRotations-workspace">
        <section className="dutyRotations-personalSummary">
          <article className="dutyRotations-personalMetric is-primary">
            <span>
              <CalendarClock />
              Proximos turnos
            </span>
            <strong>{actionableAssignments.length}</strong>
          </article>
          <article className="dutyRotations-personalMetric is-success">
            <span>
              <ShieldCheck />
              Accesos habilitados
            </span>
            <strong>{myOpenEntitlements.length}</strong>
          </article>
          <article className="dutyRotations-personalMetric is-available">
            <span>
              <Send />
              Turnos disponibles
            </span>
            <strong>{availableTurnRequests.length}</strong>
          </article>
          <article className="dutyRotations-personalMetric is-next">
            <span>
              <Clock />
              Siguiente
            </span>
            <strong>
              {nextPersonalTurn
                ? formatDutyDisplayDate(nextPersonalTurn.periodStart)
                : 'Sin turno'}
            </strong>
          </article>
        </section>

        <Card className="dutyRotations-panel">
          <CardHeader>
            <CardTitle className="dutyRotations-titleLine">
              Mis proximos turnos
              <HelpTooltip text="Muestra tus proximas responsabilidades asignadas. Desde cada tarjeta puedes completar el turno o solicitar un cambio." />
            </CardTitle>
            <CardDescription>
              {myUpcomingAssignments.length} tareas vigentes o futuras
            </CardDescription>
          </CardHeader>
          <CardContent className="dutyRotations-cardStack">
            {myUpcomingQuery.isLoading ? (
              <LoaderForComponent width={90} variant="transparent" />
            ) : myUpcomingQuery.isError ? (
              <div className="dutyRotations-contractError" role="alert">
                No se pudieron validar tus proximos turnos. Actualiza la pagina
                o contacta a administracion.
              </div>
            ) : myUpcomingAssignments.length ? (
              myUpcomingAssignments.map(renderDutyCard)
            ) : (
              <TableNoData text="No tienes turnos proximos." />
            )}
          </CardContent>
        </Card>

        <Card className="dutyRotations-panel">
          <CardHeader>
            <CardTitle className="dutyRotations-titleLine">
              Responsabilidades habilitadas
              <HelpTooltip text="Son accesos temporales abiertos por un turno. Por ejemplo, la conciliacion de faltas queda disponible solo para el periodo asignado." />
            </CardTitle>
            <CardDescription>
              Permisos temporales abiertos por tus rotaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="dutyRotations-cardStack">
            {myEntitlementsQuery.isLoading ? (
              <LoaderForComponent width={90} variant="transparent" />
            ) : myEntitlementsQuery.isError ? (
              <div className="dutyRotations-contractError" role="alert">
                No se pudieron validar tus responsabilidades habilitadas.
              </div>
            ) : myOpenEntitlements.length ? (
              myOpenEntitlements.map(entitlement => (
                <article
                  className="dutyRotations-shiftCard"
                  key={entitlement.assignment.id}
                >
                  <div className="dutyRotations-shiftInfo">
                    <div className="dutyRotations-shiftTitleRow">
                      <h3>{entitlement.assignment.duty.name}</h3>
                      <span className="dutyRotations-status dutyRotations-status-PENDING">
                        Pendiente
                      </span>
                    </div>
                    <div className="dutyRotations-metaLine">
                      <span>
                        <Calendar />
                        Turno:{' '}
                        {formatDutyDisplayDate(
                          entitlement.assignment.periodStart
                        )}
                      </span>
                      <span>
                        <CalendarClock />
                        Cobertura:{' '}
                        {entitlement.coverageLabel ||
                          `${formatDutyDisplayDate(
                            entitlement.periodStart
                          )} - ${formatDutyDisplayDate(entitlement.periodEnd)}`}
                      </span>
                      <span>
                        <CalendarClock />
                        Cierra{' '}
                        {formatDutyDisplayDate(entitlement.accessDeadline)}
                      </span>
                    </div>
                  </div>
                  <div className="dutyRotations-cardActions">
                    <Button
                      size="sm"
                      onClick={() =>
                        openAttendanceRepair(entitlement.assignment.id)
                      }
                      title="Abre la conciliacion de faltas del periodo autorizado por este turno."
                    >
                      Corregir faltas
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <TableNoData text="No tienes responsabilidades abiertas." />
            )}
          </CardContent>
        </Card>

        <Card className="dutyRotations-panel dutyRotations-personalAvailablePanel">
          <CardHeader>
            <CardTitle className="dutyRotations-titleLine">
              Turnos disponibles
              <HelpTooltip text="Lista turnos liberados por otros usuarios. Al reclamar uno, pasa a tu lista de proximos turnos." />
            </CardTitle>
            <CardDescription>
              Turnos liberados por otros usuarios que puedes tomar
            </CardDescription>
          </CardHeader>
          <CardContent className="dutyRotations-cardStack">
            {openPoolQuery.isLoading ? (
              <LoaderForComponent width={90} variant="transparent" />
            ) : openPoolQuery.isError ? (
              <div className="dutyRotations-contractError" role="alert">
                No se pudo validar la lista de turnos disponibles.
              </div>
            ) : availableTurnRequests.length ? (
              availableTurnRequests.map(request => (
                <article className="dutyRotations-poolCard" key={request.id}>
                  <div className="dutyRotations-shiftTitleRow">
                    <div>
                      <h3>{getDutyUserFullName(request.requesterUser)}</h3>
                      <p>{request.assignment?.duty.name}</p>
                    </div>
                    <span className="dutyRotations-status dutyRotations-status-OPEN_POOL">
                      Disponible
                    </span>
                  </div>
                  <span className="dutyRotations-poolDate">
                    {request.assignment
                      ? formatDutyDisplayDate(request.assignment.periodStart)
                      : ''}{' '}
                    · {request.assignment?.slotLabel || 'Dia completo'}
                  </span>
                  <Button
                    size="sm"
                    disabled={claimMutation.isPending}
                    onClick={() => claimMutation.mutate(request.id)}
                    title="Toma este turno disponible y lo asigna a tu usuario."
                  >
                    Reclamar turno
                  </Button>
                </article>
              ))
            ) : (
              <TableNoData text="No hay turnos disponibles para tomar." />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default MyDutyRotations;
