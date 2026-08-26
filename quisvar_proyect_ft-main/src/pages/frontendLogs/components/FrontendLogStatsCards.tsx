import { Activity, AlertTriangle, Clock3, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FrontendLogSummary } from '../models';

const formatNumber = (value?: number) =>
  new Intl.NumberFormat('es-PE').format(value || 0);

interface FrontendLogStatsCardsProps {
  summary?: FrontendLogSummary;
  isLoading: boolean;
  isFetching?: boolean;
}

export const FrontendLogStatsCards = ({
  summary,
  isLoading,
  isFetching = false,
}: FrontendLogStatsCardsProps) => {
  const cards = [
    {
      label: 'Eventos filtrados',
      value: formatNumber(summary?.totalEvents),
      icon: ListChecks,
    },
    {
      label: 'Criticos',
      value: formatNumber(summary?.criticalEvents),
      icon: AlertTriangle,
    },
    {
      label: 'Eventos 24h',
      value: formatNumber(summary?.eventsLast24h),
      icon: Clock3,
    },
    {
      label: 'Tipos detectados',
      value: formatNumber(summary?.eventsByType?.length),
      icon: Activity,
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
