import { Separator } from '@/components/ui/separator';
import { JsonViewer } from '@/components/app-ui/json-viewer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuditLogDetail } from '../hooks/useAuditLogs';
import type { AuditLogDetail, AuditTimeUnit } from '../models/auditLogs.types';
import { formatAuditDuration } from '../utils/timeFormat';
import { AuditSeverityBadge } from './AuditSeverityBadge';
import { AuditStatusBadge } from './AuditStatusBadge';

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString('es-PE', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : 'Sin fecha';

const fullName = (log?: AuditLogDetail) => {
  if (!log?.user) return 'Sistema';
  const firstName = log.user.profile?.firstName || '';
  const lastName = log.user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || log.user.email;
};

interface DetailRowProps {
  label: string;
  value?: string | number | null;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2">
    <span className="text-xs font-medium uppercase text-muted-foreground">
      {label}
    </span>
    <span className="break-words text-sm text-foreground">
      {value || 'N/D'}
    </span>
  </div>
);

interface AuditLogDetailSheetProps {
  logId: number | null;
  open: boolean;
  timeUnit: AuditTimeUnit;
  onOpenChange: (open: boolean) => void;
}

export const AuditLogDetailSheet = ({
  logId,
  open,
  timeUnit,
  onOpenChange,
}: AuditLogDetailSheetProps) => {
  const detailQuery = useAuditLogDetail(logId);
  const log = detailQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle>Detalle del log</SheetTitle>
          <SheetDescription>
            {log ? `${log.method} ${log.path || log.action}` : 'Cargando...'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          {detailQuery.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : log ? (
            <div className="space-y-5 p-5">
              <section className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Usuario" value={fullName(log)} />
                <DetailRow label="Correo" value={log.user?.email} />
                <DetailRow
                  label="Fecha"
                  value={formatDateTime(log.createdAt)}
                />
                <DetailRow label="Accion" value={log.action} />
                <DetailRow label="Metodo" value={log.method} />
                <DetailRow label="Ruta" value={log.path} />
                <DetailRow label="Modulo" value={log.module} />
                <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Severidad
                  </span>
                  <AuditSeverityBadge severity={log.severity} />
                </div>
                <div className="grid gap-1 rounded-md border border-border bg-background px-3 py-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </span>
                  <AuditStatusBadge statusCode={log.statusCode} />
                </div>
                <DetailRow
                  label="Tiempo"
                  value={formatAuditDuration(log.responseTime, timeUnit)}
                />
                <DetailRow label="IP" value={log.ipAddress} />
                <DetailRow label="Referrer" value={log.referrer} />
              </section>

              <DetailRow label="User agent" value={log.userAgent} />

              <Separator />

              <JsonViewer title="Request body" value={log.requestBody} />
              <JsonViewer title="Query params" value={log.queryParams} />
              {log.statusCode >= 400 ? (
                <JsonViewer title="Error response" value={log.errorResponse} />
              ) : null}
            </div>
          ) : (
            <div className="p-5 text-sm text-muted-foreground">
              No se pudo cargar el detalle
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
