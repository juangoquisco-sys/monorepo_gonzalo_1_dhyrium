import { Loader2 } from 'lucide-react';
import { JsonViewer } from '@/components/app-ui/json-viewer';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useFrontendLogEvent } from '../useFrontendLogs';
import {
  formatDateTime,
  fullName,
  levelVariant,
  statusVariant,
  typeLabel,
} from './frontendLogFormat';

const DetailField = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) => (
  <div className={`min-w-0 space-y-1 ${className}`}>
    <p className="text-xs font-medium uppercase text-muted-foreground">
      {label}
    </p>
    <p className="min-w-0 overflow-hidden break-words text-sm text-foreground [overflow-wrap:anywhere]">
      {value || 'N/D'}
    </p>
  </div>
);

interface FrontendLogEventDetailSheetProps {
  eventId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FrontendLogEventDetailSheet = ({
  eventId,
  open,
  onOpenChange,
}: FrontendLogEventDetailSheetProps) => {
  const eventQuery = useFrontendLogEvent(eventId);
  const event = eventQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex max-w-none flex-col overflow-hidden px-4 sm:px-6"
        style={{
          width: 'min(98vw, 1400px)',
          maxWidth: 'min(98vw, 1400px)',
        }}
      >
        <SheetHeader>
          <SheetTitle>Detalle de evento frontend</SheetTitle>
          <SheetDescription>
            Ocurrencia capturada con usuario, ruta, sesion y contexto tecnico.
          </SheetDescription>
        </SheetHeader>

        {eventQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Cargando detalle...
          </div>
        ) : event ? (
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
            <section className="space-y-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={levelVariant(event.level)}>{event.level}</Badge>
                <Badge variant="outline">{typeLabel(event.type)}</Badge>
                {event.statusCode && (
                  <Badge variant={statusVariant(event.statusCode)}>
                    HTTP {event.statusCode}
                  </Badge>
                )}
              </div>
              <p className="font-medium text-secondary">{event.message}</p>
              <div className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                <DetailField
                  label="Fecha"
                  value={formatDateTime(event.createdAt)}
                />
                <DetailField label="Usuario" value={fullName(event)} />
                <DetailField
                  label="Email"
                  value={event.user?.email || 'Sin usuario'}
                />
                <DetailField label="IP" value={event.ipAddress || 'Sin IP'} />
                <DetailField
                  label="Sesion"
                  value={event.sessionId || 'Sin sesion'}
                />
                <DetailField label="Release" value={event.release} />
                <DetailField label="Entorno" value={event.environment} />
                <DetailField
                  label="Ruta"
                  value={event.route || 'Sin ruta'}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            {(event.apiUrl || event.apiMethod || event.statusCode) && (
              <section className="min-w-0 space-y-3 rounded-md border border-border p-3">
                <h3 className="text-sm font-semibold text-secondary">API</h3>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <DetailField
                    label="Metodo"
                    value={event.apiMethod || 'N/D'}
                  />
                  <DetailField
                    label="Status"
                    value={event.statusCode || 'N/D'}
                  />
                  <DetailField
                    label="URL"
                    value={event.apiUrl || 'N/D'}
                    className="sm:col-span-2"
                  />
                  <DetailField
                    label="Request ID"
                    value={event.requestId || 'N/D'}
                    className="sm:col-span-2"
                  />
                </div>
              </section>
            )}

            {event.stack && (
              <JsonViewer
                title="Stack"
                value={event.stack.split('\n')}
                maxHeightClassName="max-h-64"
              />
            )}

            {event.componentStack && (
              <JsonViewer
                title="Component stack"
                value={event.componentStack.split('\n')}
                maxHeightClassName="max-h-64"
              />
            )}

            <div className="grid min-w-0 gap-3">
              <JsonViewer
                title="Breadcrumbs"
                value={event.breadcrumbs}
                maxHeightClassName="max-h-64"
              />
              <JsonViewer
                title="Contexto"
                value={event.context}
                maxHeightClassName="max-h-64"
              />
            </div>

            {event.userAgent && (
              <section className="min-w-0 space-y-2 rounded-md border border-border p-3">
                <h3 className="text-sm font-semibold text-secondary">
                  User agent
                </h3>
                <p className="min-w-0 overflow-hidden break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {event.userAgent}
                </p>
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            No se encontro el evento.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
