import { Activity, AlertTriangle, Clock3, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuditSummary } from '../models/auditLogs.types';

const formatNumber = (value?: number) =>
  new Intl.NumberFormat('es-PE').format(value || 0);

interface AuditLogStatsCardsProps {
  summary?: AuditSummary;
  isLoading: boolean;
  isFetching?: boolean;
}

export const AuditLogStatsCards = ({
  summary,
  isLoading,
  isFetching = false,
}: AuditLogStatsCardsProps) => {
  const cards = [
    {
      label: 'Total logs',
      value: formatNumber(summary?.totalLogs),
      icon: Activity,
    },
    {
      label: 'Errores',
      value: formatNumber(summary?.totalErrors),
      icon: AlertTriangle,
    },
    {
      label: 'Usuarios activos',
      value: formatNumber(summary?.activeUsers),
      icon: Users,
    },
    {
      label: 'Tiempo promedio',
      value: `${formatNumber(summary?.averageResponseTime)} ms`,
      icon: Clock3,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className={
              isFetching
                ? 'rounded-md opacity-70 shadow-app-card transition-opacity'
                : 'rounded-md shadow-app-card transition-opacity'
            }
          >
            <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
              ) : (
                <strong className="text-2xl font-semibold text-secondary">
                  {card.value}
                </strong>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
