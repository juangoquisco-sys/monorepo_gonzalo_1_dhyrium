import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuditLogItem, AuditSummary } from '../models/auditLogs.types';
import { AuditSeverityBadge } from './AuditSeverityBadge';
import { AuditStatusBadge } from './AuditStatusBadge';

const fullName = (log: AuditLogItem) => {
  if (!log.user) return 'Sistema';
  const firstName = log.user.profile?.firstName || '';
  const lastName = log.user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || log.user.email;
};

const formatUser = (user: AuditSummary['topUsers'][number]['user']) => {
  if (!user) return 'Sistema';
  const firstName = user.profile?.firstName || '';
  const lastName = user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || user.email;
};

interface AuditLogInsightsProps {
  summary?: AuditSummary;
  isLoading: boolean;
  isFetching?: boolean;
  onView: (id: number) => void;
}

export const AuditLogInsights = ({
  summary,
  isLoading,
  isFetching = false,
  onView,
}: AuditLogInsightsProps) => {
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
          <CardTitle>Top modulos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(summary?.topModules || []).map(item => (
            <div
              key={item.module}
              className="flex items-center justify-between"
            >
              <span className="truncate text-sm">{item.module}</span>
              <Badge variant="outline">{item.count}</Badge>
            </div>
          ))}
          {!summary?.topModules?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card">
        <CardHeader>
          <CardTitle>Top usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(summary?.topUsers || []).map(item => (
            <div
              key={item.userId || 'system'}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-sm">{formatUser(item.user)}</span>
              <Badge variant="outline">{item.count}</Badge>
            </div>
          ))}
          {!summary?.topUsers?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card">
        <CardHeader>
          <CardTitle>Top endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(summary?.topEndpoints || []).map(item => (
            <div
              key={`${item.method}-${item.path}`}
              className="grid gap-1 rounded-md bg-muted/50 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{item.method}</Badge>
                <span className="text-xs text-muted-foreground">
                  {item.count} hits
                </span>
              </div>
              <span className="truncate text-xs">{item.path}</span>
            </div>
          ))}
          {!summary?.topEndpoints?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card">
        <CardHeader>
          <CardTitle>Estados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(summary?.statusDistribution || []).map(item => (
            <span
              key={item.statusCode}
              className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
            >
              <AuditStatusBadge statusCode={item.statusCode} />
              {item.count}
            </span>
          ))}
          {!summary?.statusDistribution?.length && (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-app-card xl:col-span-4">
        <CardHeader className="flex-row items-center gap-2">
          <ShieldAlert className="size-4 text-danger" />
          <CardTitle>Acciones criticas recientes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {(summary?.recentCriticalActions || []).map(log => (
            <button
              key={log.id}
              type="button"
              className="grid gap-2 rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-muted/60"
              onClick={() => onView(log.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <AuditSeverityBadge severity={log.severity} />
                <span className="text-xs text-muted-foreground">
                  {log.responseTime} ms
                </span>
              </div>
              <strong className="truncate text-sm text-secondary">
                {log.method} {log.path}
              </strong>
              <span className="truncate text-xs text-muted-foreground">
                {fullName(log)}
              </span>
            </button>
          ))}
          {!summary?.recentCriticalActions?.length && (
            <p className="text-sm text-muted-foreground">
              Sin acciones criticas en el rango
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
