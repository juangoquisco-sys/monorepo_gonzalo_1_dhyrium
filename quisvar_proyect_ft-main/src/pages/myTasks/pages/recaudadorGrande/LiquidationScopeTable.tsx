import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { AppBadge } from '@/components/app-ui/app-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateUtc } from '@/utils/dayjsSpanish';
import { formatAmountMoneyPEN } from '@/utils/tools';
import type { LiquidationScopeItem } from './recaudadorGrande.types';

export const LiquidationScopeTable = ({
  items,
}: {
  items: LiquidationScopeItem[];
}) => (
  <Card>
    <CardHeader className="flex-row items-start justify-between gap-3">
      <div>
        <CardTitle>1. Sustento de liquidación</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Avance reconocido usado para calcular la liquidación.
        </p>
      </div>
      <AppBadge variant="outline">{items.length} tareas</AppBadge>
    </CardHeader>
    <CardContent className="overflow-x-auto p-0">
      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Tarea realizada</AppTableHead>
            <AppTableHead>Finalización</AppTableHead>
            <AppTableHead>Reconocido</AppTableHead>
            <AppTableHead>Estado</AppTableHead>
            <AppTableHead className="text-right">Valor calculado</AppTableHead>
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {items.map(item => (
            <AppTableRow key={`${item.subTaskId}-${item.levelId}`}>
              <AppTableCell>
                <strong className="block font-semibold">
                  {item.item ? `${item.item} ` : ''}
                  {item.taskName}
                </strong>
                <span className="text-xs text-muted-foreground">
                  Base: {formatAmountMoneyPEN(item.taskBaseAmount)}
                </span>
              </AppTableCell>
              <AppTableCell>
                {item.finishedAt ? formatDateUtc(item.finishedAt) : '—'}
              </AppTableCell>
              <AppTableCell>{item.participationPercentage}%</AppTableCell>
              <AppTableCell>
                <AppBadge variant="success">Conformidad</AppBadge>
              </AppTableCell>
              <AppTableCell className="text-right font-semibold">
                {formatAmountMoneyPEN(item.userGrossAmount)}
              </AppTableCell>
            </AppTableRow>
          ))}
        </AppTableBody>
      </AppTable>
    </CardContent>
  </Card>
);
