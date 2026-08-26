import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import {
  ArrowRight24Regular,
  ReceiptMoney24Regular,
} from '@fluentui/react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppSelect } from '@/components/app-ui/app-select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateTimeUtc } from '@/utils/dayjsSpanish';
import useProjectForFilter from '../../hooks/useProjectForFilter';
import {
  PRE_LIQUIDATION_STATUS_OPTIONS,
  PRE_LIQUIDATION_STATUS_UI,
  RECAUDADOR_GRANDE_ROUTES,
} from './recaudadorGrande.constants';
import { getRecaudadorGrandeErrorMessage } from './recaudadorGrande.errors';
import { usePreLiquidationStages } from './recaudadorGrande.queries';
import type { PreLiquidationStage } from './recaudadorGrande.types';
import {
  RecaudadorGrandeLoading,
  RecaudadorGrandeState,
} from './RecaudadorGrandeState';

export const PreLiquidationPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectForFilterQuery } = useProjectForFilter();
  const projectFilter = searchParams.get('project') ?? '';
  const stageFilter = searchParams.get('stage') ?? '';
  const statusFilter = searchParams.get('status') ?? 'ALL';
  const stagesQuery = usePreLiquidationStages({
    projectId: projectFilter ? Number(projectFilter) : undefined,
  });

  const filteredStages = useMemo(
    () =>
      (stagesQuery.data ?? []).filter(stage => {
        const matchesStage = stageFilter
          ? String(stage.id) === stageFilter
          : true;
        const matchesStatus =
          statusFilter === 'ALL' || stage.stageStatus === statusFilter;
        return matchesStage && matchesStatus;
      }),
    [stageFilter, stagesQuery.data, statusFilter]
  );

  const availableStages = useMemo(
    () =>
      projectForFilterQuery.data?.find(
        project => project.id === Number(projectFilter)
      )?.stages ?? [],
    [projectFilter, projectForFilterQuery.data]
  );

  const updateFilter = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams);
    if (target.name === 'project') next.delete('stage');
    if (target.value) next.set(target.name, target.value);
    else next.delete(target.name);
    setSearchParams(next);
  };

  return (
    <main className="grid gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Pre-liquidación de etapas
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Revise las tareas reconocidas y otorgue la conformidad antes de
            generar una solicitud de liquidación.
          </p>
        </div>
        <AppButton
          size="sm"
          variant="outline"
          onClick={() => navigate(RECAUDADOR_GRANDE_ROUTES.liquidation)}
        >
          <ReceiptMoney24Regular aria-hidden />
          Ir a liquidaciones
        </AppButton>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <AppSelect
            data={projectForFilterQuery.data}
            extractValue={project => project.id}
            label="Proyecto"
            name="project"
            onChange={updateFilter}
            renderTextField={project => project.name}
            value={projectFilter}
          />
          <AppSelect
            data={availableStages}
            disabled={!projectFilter}
            extractValue={stage => stage.id}
            label="Etapa"
            name="stage"
            onChange={updateFilter}
            renderTextField={stage => stage.name}
            value={stageFilter}
          />
          <AppSelect
            data={[...PRE_LIQUIDATION_STATUS_OPTIONS]}
            extractValue={status => status.id}
            label="Estado"
            name="status"
            onChange={updateFilter}
            renderTextField={status => status.name}
            value={statusFilter}
          />
        </CardContent>
      </Card>

      {stagesQuery.isLoading ? (
        <RecaudadorGrandeLoading label="Cargando etapas..." />
      ) : stagesQuery.isError ? (
        <RecaudadorGrandeState
          title="No se pudieron cargar las etapas"
          description={getRecaudadorGrandeErrorMessage(stagesQuery.error)}
          onRetry={() => void stagesQuery.refetch()}
        />
      ) : filteredStages.length ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredStages.map(stage => (
            <StageCard
              key={stage.id}
              stage={stage}
              onOpen={() =>
                navigate(
                  `${RECAUDADOR_GRANDE_ROUTES.preLiquidation}/etapa/${stage.id}`
                )
              }
            />
          ))}
        </section>
      ) : (
        <RecaudadorGrandeState
          title="No se encontraron etapas"
          description="Cuando exista avance técnico en una etapa, aparecerá aquí para su preparación."
        />
      )}
    </main>
  );
};

const StageCard = ({
  stage,
  onOpen,
}: {
  stage: PreLiquidationStage;
  onOpen: () => void;
}) => {
  const status = PRE_LIQUIDATION_STATUS_UI[stage.stageStatus];
  return (
    <Card className="flex min-h-60 flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{stage.name}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {stage.project.name}
            {stage.project.contract.cui
              ? ` · CUI ${stage.project.contract.cui}`
              : ''}
          </CardDescription>
        </div>
        <AppBadge variant={status.badgeVariant}>{status.label}</AppBadge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-center">
          <StageMetric label="Total" value={stage.totalTasks} />
          <StageMetric label="Revisadas" value={stage.reviewedTasks} />
          <StageMetric label="Pendientes" value={stage.pendingTasks} />
        </dl>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {formatDateTimeUtc(stage.updatedAt)}
          </span>
          <AppButton size="sm" onClick={onOpen}>
            Ver tareas
            <ArrowRight24Regular aria-hidden />
          </AppButton>
        </div>
      </CardContent>
    </Card>
  );
};

const StageMetric = ({ label, value }: { label: string; value: number }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-lg font-bold text-foreground">{value}</dd>
  </div>
);
