import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  MemoryStick,
  RefreshCw,
  Server,
  Wifi,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { useSystemHeaderAction } from './SystemHeaderActionContext';
import type {
  SystemHealthResponse,
  SystemHealthStatus,
} from './systemHealth.models';
import { useSystemHealth } from './useSystemHealth';

const numberFormatter = new Intl.NumberFormat('es-PE');

const statusLabel: Record<SystemHealthStatus, string> = {
  UP: 'Operativo',
  DEGRADED: 'Degradado',
  DOWN: 'Critico',
};

const statusBadgeVariant: Record<
  SystemHealthStatus,
  'success' | 'warning' | 'danger'
> = {
  UP: 'success',
  DEGRADED: 'warning',
  DOWN: 'danger',
};

const statusIcon = {
  UP: CheckCircle2,
  DEGRADED: AlertTriangle,
  DOWN: XCircle,
};

const formatNumber = (value?: number | null) =>
  value === null || value === undefined ? '-' : numberFormatter.format(value);

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
};

const formatUptime = (seconds?: number) => {
  const totalSeconds = seconds || 0;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getProcessMessage = (health?: SystemHealthResponse) => {
  const processCheck = health?.checks.process;
  if (!processCheck) return 'Sin datos del proceso';
  if (processCheck.status === 'DEGRADED') {
    return 'Uso de memoria por encima del umbral';
  }
  return 'Proceso Node estable';
};

interface HealthCardProps {
  title: string;
  description: string;
  status: SystemHealthStatus;
  icon: typeof Server;
  children: React.ReactNode;
}

const HealthCard = ({
  title,
  description,
  status,
  icon: Icon,
  children,
}: HealthCardProps) => {
  const StatusIcon = statusIcon[status];

  return (
    <Card className="rounded-md shadow-app-card">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="size-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {description}
          </CardDescription>
        </div>
        <Badge variant={statusBadgeVariant[status]}>
          <StatusIcon className="size-3" />
          {statusLabel[status]}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">{children}</CardContent>
    </Card>
  );
};

const MetricRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex min-h-7 items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="max-w-[60%] truncate text-right font-medium text-secondary">
      {value}
    </span>
  </div>
);

const SystemHealthPage = () => {
  const healthQuery = useSystemHealth();
  const { data: health, isError, isFetching, isLoading, refetch } = healthQuery;

  const headerAction = useMemo(
    () => ({
      onClick: () => refetch(),
      isLoading: isFetching,
      disabled: isFetching,
    }),
    [isFetching, refetch]
  );

  useSystemHeaderAction(headerAction);

  const StatusIcon = health ? statusIcon[health.status] : Loader2;
  const generalStatus = health?.status || 'DEGRADED';
  const processStatus = health?.checks.process.status || 'DEGRADED';

  return (
    <AppPageShell className="h-full overflow-y-auto">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4">
        <Card className="rounded-md shadow-app-card">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="size-5 text-primary" />
                Salud del sistema
              </CardTitle>
              <CardDescription>
                Ultima verificacion: {formatDateTime(health?.generatedAt)}
              </CardDescription>
            </div>
            <Badge variant={statusBadgeVariant[generalStatus]}>
              <StatusIcon
                className={isLoading ? 'size-3 animate-spin' : 'size-3'}
              />
              {health ? statusLabel[health.status] : 'Verificando'}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricRow
              label="Uptime"
              value={isLoading ? '-' : formatUptime(health?.uptimeSeconds)}
            />
            <MetricRow label="Entorno" value={health?.environment || '-'} />
            <MetricRow label="Node" value={health?.nodeVersion || '-'} />
            <MetricRow
              label="PID"
              value={health ? formatNumber(health.checks.process.pid) : '-'}
            />
            <MetricRow
              label="Refresco"
              value={isFetching ? 'Actualizando' : '30s'}
            />
          </CardContent>
        </Card>

        {isError && (
          <Card className="rounded-md border-danger/30 bg-danger-muted/40 shadow-app-card">
            <CardContent className="flex items-center gap-2 p-4 text-sm font-medium text-danger">
              <AlertTriangle className="size-4" />
              No se pudo cargar el diagnostico interno del sistema.
            </CardContent>
          </Card>
        )}

        <section className="grid gap-3 lg:grid-cols-2">
          <HealthCard
            title="Backend"
            description={
              health?.checks.backend.message || 'Verificando backend'
            }
            status={health?.checks.backend.status || 'DEGRADED'}
            icon={Server}
          >
            <MetricRow label="Estado HTTP" value="Respondiendo" />
            <MetricRow
              label="Tiempo activo"
              value={formatUptime(health?.uptimeSeconds)}
            />
          </HealthCard>

          <HealthCard
            title="Base de datos"
            description={
              health?.checks.database.message || 'Verificando conexion Prisma'
            }
            status={health?.checks.database.status || 'DEGRADED'}
            icon={Database}
          >
            <MetricRow
              label="Latencia"
              value={
                health?.checks.database.latencyMs === null ||
                health?.checks.database.latencyMs === undefined
                  ? '-'
                  : `${formatNumber(health.checks.database.latencyMs)} ms`
              }
            />
            <MetricRow label="Ventana señales" value="15 min" />
          </HealthCard>

          <HealthCard
            title="Socket.IO"
            description={health?.checks.socket.message || 'Verificando sockets'}
            status={health?.checks.socket.status || 'DEGRADED'}
            icon={Wifi}
          >
            <MetricRow
              label="Clientes conectados"
              value={formatNumber(health?.checks.socket.connectedClients)}
            />
            <MetricRow label="Canal realtime" value="Socket.IO" />
          </HealthCard>

          <HealthCard
            title="Proceso Node"
            description={getProcessMessage(health)}
            status={processStatus}
            icon={MemoryStick}
          >
            <MetricRow
              label="RSS"
              value={
                health
                  ? `${formatNumber(health.checks.process.memory.rssMb)} MB`
                  : '-'
              }
            />
            <MetricRow
              label="Heap usado"
              value={
                health
                  ? `${formatNumber(
                      health.checks.process.memory.heapUsedMb
                    )} MB`
                  : '-'
              }
            />
          </HealthCard>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <Card className="rounded-md shadow-app-card">
            <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock3 className="size-4 text-primary" />
                Auditoria reciente
              </CardTitle>
              <Badge
                variant={
                  health?.signals.auditLast15m.criticalErrors
                    ? 'danger'
                    : 'outline'
                }
              >
                15 min
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <MetricRow
                label="Errores"
                value={formatNumber(health?.signals.auditLast15m.totalErrors)}
              />
              <MetricRow
                label="Criticos"
                value={formatNumber(
                  health?.signals.auditLast15m.criticalErrors
                )}
              />
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-app-card">
            <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <RefreshCw className="size-4 text-primary" />
                Frontend reciente
              </CardTitle>
              <Badge
                variant={
                  health?.signals.frontendLast15m.criticalErrors
                    ? 'danger'
                    : 'outline'
                }
              >
                15 min
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <MetricRow
                label="Errores"
                value={formatNumber(
                  health?.signals.frontendLast15m.totalErrors
                )}
              />
              <MetricRow
                label="Criticos"
                value={formatNumber(
                  health?.signals.frontendLast15m.criticalErrors
                )}
              />
            </CardContent>
          </Card>
        </section>
      </main>
    </AppPageShell>
  );
};

export default SystemHealthPage;
