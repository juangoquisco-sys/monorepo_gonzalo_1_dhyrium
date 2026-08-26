import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Plus,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { AppBadge } from '@/components/app-ui/app-badge';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import DutyFormDialog from '../components/dialogs/DutyFormDialog';
import DutyStatusDialog from '../components/dialogs/DutyStatusDialog';
import RepairDutyDialog from '../components/dialogs/RepairDutyDialog';
import RosterSyncDialog from '../components/dialogs/RosterSyncDialog';
import OccurrenceExclusionsDialog from '../components/dialogs/OccurrenceExclusionsDialog';
import ShareDutyPlanningDialog from '../components/dialogs/ShareDutyPlanningDialog';
import DutyRotationsPageHeader from '../components/DutyRotationsPageHeader';
import DutyPlanningPanel from '../components/planning/DutyPlanningPanel';
import { dutyFrequencyLabels } from '../dutyRotations.constants';
import { DutyRotationContractError } from '../dutyRotations.contract';
import { openDutyRotationDialog } from '../dutyRotations.dialogs';
import { groupDutyPlanningAssignments } from '../dutyPlanningGroups';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../dutyRotations.queries';
import {
  formatDutyDateInLima,
  formatDutyDisplayDate,
  getDutySlotsFromRule,
  getDutyUserFullName,
  addDutyDays,
} from '../dutyRotations.utils';
import type {
  DutyRotation,
  ValidDutyRotation,
} from '../models/dutyRotations.types';
import {
  approveDutySwapRequest,
  getDutyAssignments,
  getPendingDirectedDutySwapRequests,
  getDutyRotations,
  rejectDutySwapRequest,
} from '../services/dutyRotations.service';
import '../dutyRotations.css';

const recurrenceSummary = (duty: ValidDutyRotation) => {
  const rule = duty.recurrenceRule;
  if (rule.frequency === 'ONCE') return formatDutyDisplayDate(rule.date);
  if (rule.frequency === 'MONTHLY') {
    return `Días ${rule.daysOfMonth.join(', ')} de cada mes`;
  }
  if (rule.frequency === 'WEEKLY') {
    return `${
      rule.weekdays.length
    } día(s) por ciclo desde ${formatDutyDisplayDate(duty.validFrom)}`;
  }
  return `${rule.weekdays.length} día(s) activos por semana`;
};

const errorOrNull = (error: unknown) =>
  error instanceof Error ? error : error ? new Error(String(error)) : null;

const DutyRotationsConfiguration = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get('tab') === 'requests' ? 'requests' : 'activities';
  const searchTerm = searchParams.get('search') ?? '';
  const selectedDutyId = searchParams.get('dutyId');
  const planningTab =
    searchParams.get('view') === 'history' ? 'history' : 'upcoming';
  const currentDate = formatDutyDateInLima(new Date());
  const upcomingEnd = addDutyDays(currentDate, 60);
  const historyStart = addDutyDays(currentDate, -90);
  const historyEnd = addDutyDays(currentDate, -1);

  const dutiesQuery = useQuery({
    queryKey: dutyRotationQueryKeys.duties,
    queryFn: getDutyRotations,
  });
  const upcomingQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.assignments,
      'planning-upcoming',
      selectedDutyId,
      currentDate,
      upcomingEnd,
    ],
    queryFn: () =>
      getDutyAssignments({
        dutyId: selectedDutyId!,
        dateFrom: currentDate,
        dateTo: upcomingEnd,
      }),
    enabled: Boolean(selectedDutyId) && planningTab === 'upcoming',
  });
  const historyQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.assignments,
      'planning-history',
      selectedDutyId,
      historyStart,
      historyEnd,
    ],
    queryFn: () =>
      getDutyAssignments({
        dutyId: selectedDutyId!,
        dateFrom: historyStart,
        dateTo: historyEnd,
      }),
    enabled: Boolean(selectedDutyId) && planningTab === 'history',
  });
  const pendingDirectedSwapsQuery = useQuery({
    queryKey: dutyRotationQueryKeys.pendingDirectedSwaps,
    queryFn: getPendingDirectedDutySwapRequests,
  });

  const duties = useMemo(() => dutiesQuery.data ?? [], [dutiesQuery.data]);
  const pendingDirectedSwaps = pendingDirectedSwapsQuery.data ?? [];
  const selectedDuty = duties.find(duty => duty.id === selectedDutyId) ?? null;
  const upcomingOccurrences = useMemo(
    () => groupDutyPlanningAssignments(upcomingQuery.data ?? []),
    [upcomingQuery.data]
  );
  const historyOccurrences = useMemo(
    () =>
      groupDutyPlanningAssignments(
        (historyQuery.data ?? []).filter(
          assignment => assignment.periodEnd < currentDate
        )
      ),
    [currentDate, historyQuery.data]
  );
  const filteredDuties = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
    if (!normalizedSearch) return duties;
    return duties.filter(duty =>
      `${duty.name} ${duty.description ?? ''}`
        .toLocaleLowerCase('es')
        .includes(normalizedSearch)
    );
  }, [duties, searchTerm]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  const resolveDirectedSwapMutation = useMutation({
    mutationFn: async ({
      swapRequestId,
      action,
    }: {
      swapRequestId: string;
      action: 'approve' | 'reject';
    }) => {
      if (action === 'approve') await approveDutySwapRequest(swapRequestId);
      else await rejectDutySwapRequest(swapRequestId);
    },
    onSuccess: async (_result, variables) => {
      SnackbarUtilities.success(
        variables.action === 'approve'
          ? 'Cambio de turno aprobado'
          : 'Solicitud de cambio rechazada'
      );
      await refetchDutyRotations(queryClient);
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof DutyRotationContractError
          ? error.message
          : 'No se pudo atender la solicitud de cambio'
      );
    },
  });

  const openDutyForm = (duty: ValidDutyRotation | null) => {
    openDutyRotationDialog(
      {
        title: duty ? `Editar ${duty.name}` : 'Nueva actividad de rotación',
        description:
          'Configura el trabajo paso a paso y revisa los próximos turnos antes de guardar.',
        width: 'min(96vw, 76rem)',
        maxHeight: '92vh',
      },
      getDialogHandle => (
        <DutyFormDialog duty={duty} getDialogHandle={getDialogHandle} />
      )
    );
  };

  const openStatus = (duty: DutyRotation) => {
    openDutyRotationDialog(
      {
        title: duty.isActive ? 'Desactivar actividad' : 'Reactivar actividad',
        description: 'Revisa el impacto antes de confirmar.',
        width: 'min(94vw, 36rem)',
      },
      getDialogHandle => (
        <DutyStatusDialog duty={duty} getDialogHandle={getDialogHandle} />
      )
    );
  };

  const openRepair = (duty: ValidDutyRotation) => {
    openDutyRotationDialog(
      {
        title: 'Reparar próximos turnos',
        description: 'Acción administrativa por actividad.',
        width: 'min(94vw, 36rem)',
      },
      getDialogHandle => (
        <RepairDutyDialog duty={duty} getDialogHandle={getDialogHandle} />
      )
    );
  };

  const openRosterSync = (duty: ValidDutyRotation) => {
    openDutyRotationDialog(
      {
        title: 'Sincronizar personal activo',
        description:
          'Previsualiza ingresos, bajas y turnos protegidos antes de confirmar.',
        width: 'min(94vw, 46rem)',
      },
      getDialogHandle => (
        <RosterSyncDialog duty={duty} getDialogHandle={getDialogHandle} />
      )
    );
  };

  const openOccurrenceExclusions = (
    duty: ValidDutyRotation,
    occurrenceKey: string
  ) => {
    openDutyRotationDialog(
      {
        title: 'Registrar ausencias de la jornada',
        description:
          'La redistribución afecta solamente esta ocurrencia futura.',
        width: 'min(96vw, 58rem)',
        maxHeight: '92vh',
      },
      getDialogHandle => (
        <OccurrenceExclusionsDialog
          duty={duty}
          occurrenceKey={occurrenceKey}
          getDialogHandle={getDialogHandle}
        />
      )
    );
  };

  const openShare = (duty: ValidDutyRotation) => {
    openDutyRotationDialog(
      {
        title: 'Compartir planificación',
        description:
          'Prepara imágenes operativas con la distribución vigente del equipo.',
        width: 'min(96vw, 58rem)',
        maxHeight: '92vh',
      },
      getDialogHandle => (
        <ShareDutyPlanningDialog
          duty={duty}
          currentDate={currentDate}
          getDialogHandle={getDialogHandle}
        />
      )
    );
  };

  const renderActivities = () => {
    if (dutiesQuery.isLoading) return <LoaderForComponent />;
    if (dutiesQuery.isError) {
      return (
        <div className="dutyRotations-contractError" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>No se pudieron interpretar las actividades</strong>
            <p>
              {errorOrNull(dutiesQuery.error)?.message ??
                'El servidor devolvió una respuesta incompatible.'}
            </p>
            <Button variant="outline" onClick={() => dutiesQuery.refetch()}>
              <RefreshCcw aria-hidden="true" /> Reintentar
            </Button>
          </div>
        </div>
      );
    }
    if (!duties.length) {
      return (
        <div className="dutyRotations-emptyState">
          <CalendarRange aria-hidden="true" />
          <strong>No hay actividades configuradas</strong>
          <p>Crea una actividad para generar sus próximos turnos.</p>
        </div>
      );
    }
    if (!filteredDuties.length) {
      return (
        <div className="dutyRotations-emptyState">
          <Search aria-hidden="true" />
          <strong>No encontramos coincidencias</strong>
          <p>Prueba con otro nombre o limpia la búsqueda.</p>
        </div>
      );
    }

    return (
      <div className="dutyRotations-activityList">
        {filteredDuties.map(duty => {
          const isValid = duty.configurationStatus === 'VALID';
          const slots = isValid
            ? getDutySlotsFromRule(duty.recurrenceRule)
            : [];
          return (
            <article
              className={`dutyRotations-activityRow ${
                isValid ? '' : 'is-configuration-invalid'
              }`}
              key={duty.id}
            >
              <div className="dutyRotations-activityIdentity">
                <div>
                  <strong>{duty.name}</strong>
                  <AppBadge variant={duty.isActive ? 'success' : 'outline'}>
                    {duty.isActive ? 'Activa' : 'Inactiva'}
                  </AppBadge>
                </div>
                <p>{duty.description || 'Sin descripción'}</p>
                {!isValid ? (
                  <span className="dutyRotations-activityIssue">
                    <AlertTriangle aria-hidden="true" /> Configuración
                    incompatible
                  </span>
                ) : null}
              </div>

              <dl className="dutyRotations-activityFacts">
                <div>
                  <dt>Calendario</dt>
                  <dd>
                    {isValid
                      ? `${
                          dutyFrequencyLabels[duty.frequency]
                        } · ${recurrenceSummary(duty)}`
                      : 'Regla no disponible'}
                  </dd>
                </div>
                <div>
                  <dt>Equipo</dt>
                  <dd>
                    {duty.participants.length}{' '}
                    {duty.participants.length === 1
                      ? 'participante'
                      : 'participantes'}
                    {isValid &&
                    duty.participantSource === 'ACTIVE_ELIGIBLE_SYNC'
                      ? ' · padrón activo'
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Organización</dt>
                  <dd>
                    {isValid
                      ? `${slots.length} ${
                          slots.length === 1 ? 'tarea o zona' : 'tareas o zonas'
                        }${
                          slots.length
                            ? ` · ${slots
                                .slice(0, 3)
                                .map(slot => slot.label)
                                .join(', ')}${
                                slots.length > 3 ? ` +${slots.length - 3}` : ''
                              }`
                            : ''
                        }`
                      : 'No disponible'}
                  </dd>
                </div>
              </dl>

              <div className="dutyRotations-activityActions">
                <Button
                  type="button"
                  onClick={() =>
                    updateSearchParams({ dutyId: duty.id, view: null })
                  }
                >
                  Ver planificación <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <section className="dutyRotations">
      <DutyRotationsPageHeader
        title="Planificación de rotaciones"
        description="Organiza actividades, revisa próximas jornadas y comunica la distribución al equipo."
        action={
          <Button onClick={() => openDutyForm(null)}>
            <Plus aria-hidden="true" /> Nueva actividad
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={value => updateSearchParams({ tab: value })}
        className="dutyRotations-planningWorkspace"
      >
        <div className="dutyRotations-planningToolbar">
          <TabsList>
            <TabsTrigger value="activities">
              Actividades <span>{duties.length}</span>
            </TabsTrigger>
            <TabsTrigger value="requests">
              Cambios pendientes <span>{pendingDirectedSwaps.length}</span>
            </TabsTrigger>
          </TabsList>
          {activeTab === 'activities' ? (
            <label className="dutyRotations-activitySearch">
              <Search aria-hidden="true" />
              <span className="sr-only">Buscar actividad</span>
              <Input
                value={searchTerm}
                placeholder="Buscar por nombre o descripción"
                onChange={event =>
                  updateSearchParams({ search: event.target.value || null })
                }
              />
            </label>
          ) : (
            <Button
              variant="outline"
              onClick={() => pendingDirectedSwapsQuery.refetch()}
              disabled={pendingDirectedSwapsQuery.isFetching}
            >
              <RefreshCcw aria-hidden="true" /> Actualizar
            </Button>
          )}
        </div>

        <TabsContent value="activities">{renderActivities()}</TabsContent>
        <TabsContent value="requests">
          {pendingDirectedSwapsQuery.isLoading ? (
            <LoaderForComponent />
          ) : pendingDirectedSwapsQuery.isError ? (
            <div className="dutyRotations-contractError" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div>
                <strong>No se pudieron consultar los cambios pendientes</strong>
                <p>
                  {errorOrNull(pendingDirectedSwapsQuery.error)?.message ??
                    'El servidor devolvió solicitudes incompatibles.'}
                </p>
              </div>
            </div>
          ) : pendingDirectedSwaps.length === 0 ? (
            <div className="dutyRotations-emptyState">
              <CheckCircle2 aria-hidden="true" />
              <strong>No hay cambios dirigidos pendientes</strong>
              <p>Las nuevas solicitudes aparecerán en esta sección.</p>
            </div>
          ) : (
            <div className="dutyRotations-requestList">
              {pendingDirectedSwaps.map(request => (
                <article className="dutyRotations-requestRow" key={request.id}>
                  <div>
                    <strong>{request.assignment?.duty.name}</strong>
                    <p>
                      {getDutyUserFullName(request.requesterUser)} →{' '}
                      {getDutyUserFullName(request.targetUser)}
                    </p>
                    {request.assignment ? (
                      <small>
                        {formatDutyDisplayDate(request.assignment.periodStart)}{' '}
                        · {request.assignment.slotLabel}
                      </small>
                    ) : null}
                  </div>
                  <p>{request.reason || 'Sin motivo registrado.'}</p>
                  <div>
                    <Button
                      size="sm"
                      disabled={resolveDirectedSwapMutation.isPending}
                      onClick={() =>
                        resolveDirectedSwapMutation.mutate({
                          swapRequestId: request.id,
                          action: 'approve',
                        })
                      }
                    >
                      <CheckCircle2 aria-hidden="true" /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveDirectedSwapMutation.isPending}
                      onClick={() =>
                        resolveDirectedSwapMutation.mutate({
                          swapRequestId: request.id,
                          action: 'reject',
                        })
                      }
                    >
                      <XCircle aria-hidden="true" /> Rechazar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DutyPlanningPanel
        duty={selectedDuty}
        open={Boolean(selectedDuty)}
        activeTab={planningTab}
        currentDate={currentDate}
        onOpenChange={open => {
          if (!open) updateSearchParams({ dutyId: null, view: null });
        }}
        onTabChange={tab =>
          updateSearchParams({ view: tab === 'history' ? 'history' : null })
        }
        onManageAbsences={occurrenceKey => {
          if (selectedDuty?.configurationStatus === 'VALID') {
            openOccurrenceExclusions(selectedDuty, occurrenceKey);
          }
        }}
        onEdit={
          selectedDuty?.configurationStatus === 'VALID' &&
          selectedDuty.allowedActions.edit
            ? () => openDutyForm(selectedDuty)
            : undefined
        }
        onRepair={
          selectedDuty?.configurationStatus === 'VALID' &&
          selectedDuty.allowedActions.repair
            ? () => openRepair(selectedDuty)
            : undefined
        }
        onRosterSync={
          selectedDuty?.configurationStatus === 'VALID' &&
          selectedDuty.participantSource === 'ACTIVE_ELIGIBLE_SYNC'
            ? () => openRosterSync(selectedDuty)
            : undefined
        }
        onStatusChange={
          selectedDuty &&
          (selectedDuty.isActive
            ? selectedDuty.allowedActions.deactivate
            : selectedDuty.allowedActions.reactivate)
            ? () => openStatus(selectedDuty)
            : undefined
        }
        onShare={
          selectedDuty?.configurationStatus === 'VALID'
            ? () => openShare(selectedDuty)
            : undefined
        }
        upcoming={{
          occurrences: upcomingOccurrences,
          isLoading: upcomingQuery.isLoading,
          isError: upcomingQuery.isError,
          error: errorOrNull(upcomingQuery.error),
          refetch: () => void upcomingQuery.refetch(),
        }}
        history={{
          occurrences: historyOccurrences,
          isLoading: historyQuery.isLoading,
          isError: historyQuery.isError,
          error: errorOrNull(historyQuery.error),
          refetch: () => void historyQuery.refetch(),
        }}
      />
    </section>
  );
};

export default DutyRotationsConfiguration;
