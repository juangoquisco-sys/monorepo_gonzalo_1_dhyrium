import { useMemo, useState } from 'react';

import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { DialogHandle } from '@/utils/dialog';
import { formatDateUtc } from '@/utils/dayjsSpanish';
import { formatAmountMoneyPEN } from '@/utils/tools';
import type {
  PayMessages,
  Report,
} from '@/pages/procedure/pages/salaryList/pages/interface/payroll.types';
import { getRecaudadorGrandeErrorMessage } from './recaudadorGrande.errors';
import {
  useReconcileLiquidation,
  useUnamortizedAdvances,
} from './recaudadorGrande.queries';
import type { UnamortizedAdvance } from './recaudadorGrande.types';
import {
  RecaudadorGrandeLoading,
  RecaudadorGrandeState,
} from './RecaudadorGrandeState';

interface LiquidationReconciliationDialogProps {
  getDialogHandle: () => DialogHandle | null;
  payrollId: number;
  payMessage: PayMessages;
  report: Report;
  onComplete: () => void;
}

const LiquidationReconciliationDialog = ({
  getDialogHandle,
  payrollId,
  payMessage,
  report,
  onComplete,
}: LiquidationReconciliationDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const userId = report.userId || payMessage.userInit?.user.id || 0;
  const grossAmount = Number(report.subprice || report.price || 0);
  const items = report.liquidationScopeSnapshot?.items ?? [];
  const advancesQuery = useUnamortizedAdvances(userId, true);
  const reconcileMutation = useReconcileLiquidation(payrollId);
  const selectedAmount = useMemo(
    () =>
      (advancesQuery.data ?? []).reduce(
        (total, advance) =>
          selectedIds.includes(advance.id)
            ? total + Number(advance.price || 0)
            : total,
        0
      ),
    [advancesQuery.data, selectedIds]
  );
  const netAmount = grossAmount - selectedAmount;

  const toggleAdvance = (advance: UnamortizedAdvance) => {
    setSelectedIds(current =>
      current.includes(advance.id)
        ? current.filter(id => id !== advance.id)
        : [...current, advance.id]
    );
  };

  const handleConfirm = async () => {
    try {
      await reconcileMutation.mutateAsync({
        payrollId,
        liquidationReportId: report.id,
        advanceReportIds: selectedIds,
      });
      SnackbarUtilities.success('Liquidación conciliada y autorizada.');
      onComplete();
      getDialogHandle()?.close();
    } catch (error) {
      SnackbarUtilities.error(getRecaudadorGrandeErrorMessage(error));
    }
  };

  const profile = payMessage.userInit?.user.profile;

  return (
    <div className="grid min-h-0 gap-4">
      <div className="rounded-md bg-muted p-3 text-sm">
        <strong className="block text-foreground">
          {profile
            ? `${profile.firstName} ${profile.lastName}`
            : 'Usuario de la liquidación'}
        </strong>
        <span className="text-muted-foreground">
          {report.liquidationScopeSnapshot?.projectName ?? report.name}
        </span>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-2">
        <section className="min-w-0 overflow-hidden rounded-lg border border-border">
          <h3 className="border-b border-border bg-muted/50 p-3 text-sm font-bold">
            1. Sustento técnico
          </h3>
          <div className="max-h-72 overflow-auto">
            <AppTable>
              <AppTableHeader>
                <AppTableRow>
                  <AppTableHead>Tarea</AppTableHead>
                  <AppTableHead>Participación</AppTableHead>
                  <AppTableHead className="text-right">Monto</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {items.map(item => (
                  <AppTableRow key={`${item.subTaskId}-${item.levelId}`}>
                    <AppTableCell>
                      <strong className="block">
                        {item.item ? `${item.item} ` : ''}
                        {item.taskName}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {item.finishedAt
                          ? formatDateUtc(item.finishedAt)
                          : 'Sin fecha'}
                      </span>
                    </AppTableCell>
                    <AppTableCell>
                      <AppBadge variant="success">
                        {item.participationPercentage}%
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell className="text-right">
                      {formatAmountMoneyPEN(item.userGrossAmount)}
                    </AppTableCell>
                  </AppTableRow>
                ))}
                {!items.length && (
                  <AppTableRow>
                    <AppTableCell className="h-20 text-center" colSpan={3}>
                      El reporte no contiene un detalle de tareas.
                    </AppTableCell>
                  </AppTableRow>
                )}
              </AppTableBody>
            </AppTable>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-border">
          <h3 className="border-b border-border bg-muted/50 p-3 text-sm font-bold">
            2. Adelantos por amortizar
          </h3>
          {advancesQuery.isLoading ? (
            <RecaudadorGrandeLoading label="Consultando adelantos..." />
          ) : advancesQuery.isError ? (
            <div className="p-3">
              <RecaudadorGrandeState
                title="No se pudieron cargar los adelantos"
                description={getRecaudadorGrandeErrorMessage(
                  advancesQuery.error
                )}
                onRetry={() => void advancesQuery.refetch()}
              />
            </div>
          ) : (
            <div className="max-h-72 overflow-auto">
              <AppTable>
                <AppTableHeader>
                  <AppTableRow>
                    <AppTableHead className="w-10" />
                    <AppTableHead>Concepto</AppTableHead>
                    <AppTableHead className="text-right">Monto</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody>
                  {(advancesQuery.data ?? []).map(advance => (
                    <AppTableRow key={advance.id}>
                      <AppTableCell>
                        <input
                          aria-label={`Amortizar ${advance.name}`}
                          type="checkbox"
                          checked={selectedIds.includes(advance.id)}
                          onChange={() => toggleAdvance(advance)}
                        />
                      </AppTableCell>
                      <AppTableCell>
                        <label className="cursor-pointer">
                          <strong className="block">{advance.name}</strong>
                          <span className="text-xs text-muted-foreground">
                            {formatDateUtc(advance.createdAt)}
                          </span>
                        </label>
                      </AppTableCell>
                      <AppTableCell className="text-right text-danger">
                        - {formatAmountMoneyPEN(advance.price)}
                      </AppTableCell>
                    </AppTableRow>
                  ))}
                  {!advancesQuery.data?.length && (
                    <AppTableRow>
                      <AppTableCell className="h-20 text-center" colSpan={3}>
                        No hay adelantos pendientes.
                      </AppTableCell>
                    </AppTableRow>
                  )}
                </AppTableBody>
              </AppTable>
            </div>
          )}
        </section>
      </div>

      <dl className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-3">
        <Summary label="Monto bruto" value={grossAmount} />
        <Summary label="Amortización" value={selectedAmount} />
        <Summary
          danger={netAmount < 0}
          label="Neto a pagar"
          value={netAmount}
        />
      </dl>

      <div className="flex justify-end gap-2">
        <AppButton variant="ghost" onClick={() => getDialogHandle()?.close()}>
          Cancelar
        </AppButton>
        <AppButton
          disabled={
            netAmount < 0 || report.isAuthorized || reconcileMutation.isPending
          }
          onClick={() => void handleConfirm()}
        >
          {reconcileMutation.isPending
            ? 'Conciliando...'
            : 'Confirmar liquidación'}
        </AppButton>
      </div>
    </div>
  );
};

const Summary = ({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) => (
  <div className="border-b border-border p-3 last:border-0 sm:border-b-0 sm:border-r">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={danger ? 'font-bold text-danger' : 'font-bold'}>
      {formatAmountMoneyPEN(value)}
    </dd>
  </div>
);

export default LiquidationReconciliationDialog;
