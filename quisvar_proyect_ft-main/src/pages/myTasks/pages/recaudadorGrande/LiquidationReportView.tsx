import { AppBadge } from '@/components/app-ui/app-badge';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { formatDateUtc } from '@/utils/dayjsSpanish';
import { formatAmountMoneyPEN } from '@/utils/tools';
import type { LiquidationScopeItem } from './recaudadorGrande.types';

interface LiquidationReportViewProps {
  items: LiquidationScopeItem[];
  grossAmount: number;
  amortizedAmount: number;
  netAmount: number;
}

export const LiquidationReportView = ({
  items,
  grossAmount,
  amortizedAmount,
  netAmount,
}: LiquidationReportViewProps) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
    <div className="min-h-0 flex-1 overflow-auto">
      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Tarea</AppTableHead>
            <AppTableHead>Fecha de término</AppTableHead>
            <AppTableHead>Participación</AppTableHead>
            <AppTableHead className="text-right">Costo base</AppTableHead>
            <AppTableHead className="text-right">Monto liquidable</AppTableHead>
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
                  Con conformidad de etapa
                </span>
              </AppTableCell>
              <AppTableCell>
                {item.finishedAt ? formatDateUtc(item.finishedAt) : '—'}
              </AppTableCell>
              <AppTableCell>
                <AppBadge variant="success">
                  {item.participationPercentage}%
                </AppBadge>
              </AppTableCell>
              <AppTableCell className="text-right">
                {formatAmountMoneyPEN(item.taskBaseAmount)}
              </AppTableCell>
              <AppTableCell className="text-right font-semibold">
                {formatAmountMoneyPEN(item.userGrossAmount)}
              </AppTableCell>
            </AppTableRow>
          ))}
          {!items.length && (
            <AppTableRow>
              <AppTableCell className="h-28 text-center" colSpan={5}>
                No hay tareas en el sustento de liquidación.
              </AppTableCell>
            </AppTableRow>
          )}
        </AppTableBody>
      </AppTable>
    </div>
    <dl className="grid border-t border-border bg-muted/50 sm:grid-cols-3">
      <Amount label="Monto bruto liquidable" value={grossAmount} />
      <Amount
        className="text-danger"
        label="Adelantos amortizados"
        value={amortizedAmount}
      />
      <Amount
        className="text-success"
        label="Líquido a percibir"
        value={netAmount}
      />
    </dl>
  </div>
);

const Amount = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: number;
  className?: string;
}) => (
  <div className="border-b border-border p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
    <dt className="text-xs font-semibold uppercase text-muted-foreground">
      {label}
    </dt>
    <dd className={`mt-1 text-lg font-bold ${className}`}>
      {formatAmountMoneyPEN(value)}
    </dd>
  </div>
);
