import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FrontendLogSummary } from '../models';
import {
  formatDateTime,
  fullName,
  levelVariant,
  typeLabel,
} from './frontendLogFormat';

interface FrontendLogInsightsProps {
  summary?: FrontendLogSummary;
  isLoading: boolean;
  isFetching?: boolean;
  onViewEvent: (id: number) => void;
}

export const FrontendLogInsights = ({
  summary,
  isLoading,
  isFetching = false,
  onViewEvent,
}: FrontendLogInsightsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-md border border-border bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={
        isFetching
          ? 'grid gap-3 opacity-70 transition-opacity xl:grid-cols-4'
          : 'grid gap-3 transition-opacity xl:grid-cols-4'
      }
    >
      <Card className="rounded-md shadow-app-card">
        <CardHeader>
          <CardTitle>Tipos frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(summary?.eventsByType || []).map(item => (
            <div
              key={item.type}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-sm">{typeLabel(item.type)}</span>
              <Badge variant="outline">{item.count}</Badge>
            </div>
          ))}
          {!summary?.eventsByType?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card">
        <CardHeader>
          <CardTitle>Niveles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(summary?.eventsByLevel || []).map(item => (
            <span
              key={item.level}
              className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
            >
              <Badge variant={levelVariant(item.level)}>{item.level}</Badge>
              {item.count}
            </span>
          ))}
          {!summary?.eventsByLevel?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card xl:col-span-2">
        <CardHeader>
          <CardTitle>Rutas con mas eventos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {(summary?.topRoutes || []).map(item => (
            <div
              key={item.route}
              className="grid gap-1 rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{item.route}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            </div>
          ))}
          {!summary?.topRoutes?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card xl:col-span-4">
        <CardHeader className="flex-row items-center gap-2">
          <ShieldAlert className="size-4 text-danger" />
          <CardTitle>Eventos criticos recientes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {(summary?.recentCriticalEvents || []).map(event => (
            <button
              key={event.id}
              type="button"
              className="grid gap-2 rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-muted/60"
              onClick={() => onViewEvent(event.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={levelVariant(event.level)}>{event.level}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </span>
              </div>
              <strong className="line-clamp-2 text-sm text-secondary">
                {event.message}
              </strong>
              <span className="truncate text-xs text-muted-foreground">
                {fullName(event)}
              </span>
            </button>
          ))}
          {!summary?.recentCriticalEvents?.length && (
            <p className="text-sm text-muted-foreground">
              Sin eventos criticos en el rango
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
