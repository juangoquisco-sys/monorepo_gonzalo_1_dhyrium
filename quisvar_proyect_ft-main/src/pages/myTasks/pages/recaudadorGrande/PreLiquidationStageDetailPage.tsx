import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  ArrowLeft24Regular,
  Open24Regular,
  ReceiptMoney24Regular,
} from '@fluentui/react-icons';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppSelect } from '@/components/app-ui/app-select';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useRole from '@/hooks/useRole';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { formatDateTimeUtc } from '@/utils/dayjsSpanish';
import { formatAmountMoneyPEN } from '@/utils/tools';
import {
  PRE_LIQUIDATION_STATUS_UI,
  RECAUDADOR_GRANDE_PERMISSION,
  RECAUDADOR_GRANDE_ROUTES,
  TASK_STATUS_OPTIONS,
} from './recaudadorGrande.constants';
import { getRecaudadorGrandeErrorMessage } from './recaudadorGrande.errors';
import {
  useGrantStageConformity,
  usePreLiquidationStageTasks,
  usePreLiquidationStages,
} from './recaudadorGrande.queries';
import {
  RecaudadorGrandeLoading,
  RecaudadorGrandeState,
} from './RecaudadorGrandeState';

export const PreLiquidationStageDetailPage = () => {
  const navigate = useNavigate();
  const { stageId, taskId } = useParams();
  const currentStageId = Number(stageId) || null;
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { hasAccess: canGrantConformity } = useRole(
    RECAUDADOR_GRANDE_PERMISSION.managerRole,
    RECAUDADOR_GRANDE_PERMISSION.menu,
    RECAUDADOR_GRANDE_PERMISSION.subMenu
  );
  const stageQuery = usePreLiquidationStages(
    currentStageId ? { stageId: currentStageId } : {}
  );
  const tasksQuery = usePreLiquidationStageTasks(currentStageId);
  const grantMutation = useGrantStageConformity();
  const stage = stageQuery.data?.find(item => item.id === currentStageId);
  const tasks = useMemo(
    () =>
      (tasksQuery.data?.tasks ?? []).filter(task => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'PENDING') {
          return !['REVIEWED', 'DONE'].includes(task.status);
        }
        return task.status === statusFilter;
      }),
    [statusFilter, tasksQuery.data?.tasks]
  );

  const handleGrantConformity = async () => {
    if (!currentStageId) return;
    try {
      await grantMutation.mutateAsync(currentStageId);
      SnackbarUtilities.success('Conformidad de etapa registrada.');
    } catch (error) {
      SnackbarUtilities.error(getRecaudadorGrandeErrorMessage(error));
    }
  };

  if (stageQuery.isLoading || tasksQuery.isLoading) {
    return <RecaudadorGrandeLoading label="Cargando detalle de etapa..." />;
  }

  if (stageQuery.isError || tasksQuery.isError) {
    return (
      <main className="p-4 lg:p-6">
        <RecaudadorGrandeState
          title="No se pudo cargar la etapa"
          description={getRecaudadorGrandeErrorMessage(
            stageQuery.error ?? tasksQuery.error
          )}
          onRetry={() => {
            void stageQuery.refetch();
            void tasksQuery.refetch();
          }}
        />
      </main>
    );
  }

  if (!stage || !tasksQuery.data) {
    return (
      <main className="p-4 lg:p-6">
        <RecaudadorGrandeState
          title="Etapa no encontrada"
          description="Regrese al listado y seleccione otra etapa."
        />
      </main>
    );
  }

  const status = PRE_LIQUIDATION_STATUS_UI[stage.stageStatus];

  return (
    <main className="grid gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppButton
          size="sm"
          variant="ghost"
          onClick={() => navigate(RECAUDADOR_GRANDE_ROUTES.preLiquidation)}
        >
          <ArrowLeft24Regular aria-hidden />
          Volver al listado
        </AppButton>
        <AppButton
          size="sm"
          variant="outline"
          onClick={() => navigate(RECAUDADOR_GRANDE_ROUTES.liquidation)}
        >
          <ReceiptMoney24Regular aria-hidden />
          Nueva liquidación
        </AppButton>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{stage.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {tasksQuery.data.stage.projectName}
              {tasksQuery.data.stage.cui
                ? ` · CUI ${tasksQuery.data.stage.cui}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppBadge variant={status.badgeVariant}>{status.label}</AppBadge>
            {stage.isEligibleForLiquidation ? (
              <AppButton
                size="sm"
                onClick={() => navigate(RECAUDADOR_GRANDE_ROUTES.liquidation)}
              >
                Liquidar etapa
              </AppButton>
            ) : (
              canGrantConformity && (
                <AppButton
                  disabled={
                    !tasksQuery.data.summary.canGrantConformity ||
                    grantMutation.isPending
                  }
                  size="sm"
                  onClick={() => void handleGrantConformity()}
                >
                  {grantMutation.isPending
                    ? 'Registrando...'
                    : 'Dar conformidad'}
                </AppButton>
              )
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric
              label="Total de tareas"
              value={tasksQuery.data.summary.totalTasks}
            />
            <SummaryMetric
              label="Revisadas"
              value={tasksQuery.data.summary.reviewedTasks}
            />
            <SummaryMetric
              label="Con conformidad"
              value={tasksQuery.data.summary.doneTasks}
            />
            <SummaryMetric
              label="Pendientes"
              value={tasksQuery.data.summary.pendingTasks}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Listado de tareas</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Mostrando {tasks.length} de {tasksQuery.data.tasks.length}.
            </p>
          </div>
          <AppSelect
            containerClassName="w-full sm:w-56"
            data={[...TASK_STATUS_OPTIONS]}
            extractValue={option => option.id}
            id="pre-liquidation-task-status"
            label="Estado"
            name="pre-liquidation-task-status"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setStatusFilter(event.target.value || 'ALL')
            }
            renderTextField={option => option.name}
            value={statusFilter}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Tarea</AppTableHead>
                <AppTableHead>Estado</AppTableHead>
                <AppTableHead>Reconocido</AppTableHead>
                <AppTableHead>Modificación</AppTableHead>
                <AppTableHead className="text-right">Valor</AppTableHead>
                <AppTableHead className="text-right">Acciones</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {tasks.map(task => (
                <AppTableRow key={task.id}>
                  <AppTableCell>
                    <strong className="block font-semibold text-foreground">
                      {task.item ? `${task.item} ` : ''}
                      {task.name}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {task.days} días
                    </span>
                  </AppTableCell>
                  <AppTableCell>
                    <TaskStatusBadge status={task.status} />
                  </AppTableCell>
                  <AppTableCell>{task.participationPercentage}%</AppTableCell>
                  <AppTableCell>
                    {formatDateTimeUtc(task.updatedAt)}
                  </AppTableCell>
                  <AppTableCell className="text-right font-medium">
                    {formatAmountMoneyPEN(task.price)}
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex justify-end gap-1">
                      <AppButton
                        aria-label={`Abrir ${task.name} en Mis tareas`}
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => navigate(`tarea/${task.id}`)}
                      >
                        <Open24Regular aria-hidden />
                      </AppButton>
                      <AppButton
                        aria-label={`Abrir ${task.name} en Especialidades`}
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(
                            `/especialidades/proyecto/${tasksQuery.data.stage.projectId}/etapa/${task.stageId}/presupuestos/tarea/${task.id}`
                          )
                        }
                      >
                        <Open24Regular aria-hidden />
                      </AppButton>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))}
              {!tasks.length && (
                <AppTableRow>
                  <AppTableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No hay tareas para el filtro seleccionado.
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable>
        </CardContent>
      </Card>

      {taskId && <Outlet />}
    </main>
  );
};

const SummaryMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md bg-muted p-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-xl font-bold text-foreground">{value}</dd>
  </div>
);

const TaskStatusBadge = ({ status }: { status: string }) => {
  if (status === 'DONE')
    return <AppBadge variant="success">Conformidad</AppBadge>;
  if (status === 'REVIEWED')
    return <AppBadge variant="review">Revisada</AppBadge>;
  return <AppBadge variant="warning">Pendiente</AppBadge>;
};
