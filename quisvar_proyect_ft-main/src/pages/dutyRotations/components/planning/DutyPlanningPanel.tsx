import {
  AlertTriangle,
  History,
  Pencil,
  Power,
  RefreshCcw,
  Share2,
  Wrench,
} from 'lucide-react';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DutyPlanningOccurrence } from '../../dutyPlanningGroups';
import type { DutyRotation } from '../../models/dutyRotations.types';
import DutyPlanningOccurrences from './DutyPlanningOccurrences';

interface PlanningQueryState {
  occurrences: DutyPlanningOccurrence[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

interface DutyPlanningPanelProps {
  duty: DutyRotation | null;
  open: boolean;
  activeTab: 'upcoming' | 'history';
  currentDate: string;
  upcoming: PlanningQueryState;
  history: PlanningQueryState;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: 'upcoming' | 'history') => void;
  onManageAbsences: (occurrenceKey: string) => void;
  onEdit?: () => void;
  onRepair?: () => void;
  onRosterSync?: () => void;
  onStatusChange?: () => void;
  onShare?: () => void;
}

const PlanningState = ({
  currentDate,
  duty,
  emptyMessage,
  onManageAbsences,
  query,
}: {
  currentDate: string;
  duty: DutyRotation;
  emptyMessage: string;
  onManageAbsences?: (occurrenceKey: string) => void;
  query: PlanningQueryState;
}) => {
  if (query.isLoading) return <LoaderForComponent />;
  if (query.isError) {
    return (
      <div className="dutyRotations-contractError" role="alert">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>No se pudo cargar esta planificación</strong>
          <p>{query.error?.message ?? 'La respuesta no fue válida.'}</p>
          <Button variant="outline" onClick={query.refetch}>
            <RefreshCcw aria-hidden="true" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }
  return (
    <DutyPlanningOccurrences
      duty={duty}
      occurrences={query.occurrences}
      currentDate={currentDate}
      emptyMessage={emptyMessage}
      onManageAbsences={onManageAbsences}
    />
  );
};

const DutyPlanningPanel = ({
  activeTab,
  currentDate,
  duty,
  history,
  onEdit,
  onManageAbsences,
  onOpenChange,
  onRepair,
  onRosterSync,
  onShare,
  onStatusChange,
  onTabChange,
  open,
  upcoming,
}: DutyPlanningPanelProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="dutyRotations-planningSheet sm:max-w-3xl">
      {duty ? (
        <>
          <SheetHeader>
            <span className="dutyRotations-planningEyebrow">
              Planificación de actividad
            </span>
            <SheetTitle>{duty.name}</SheetTitle>
            <SheetDescription>
              Consulta las jornadas por grupo y prepara un aviso para el equipo.
            </SheetDescription>
          </SheetHeader>
          <div className="dutyRotations-planningSheetActions">
            {onEdit ? (
              <Button type="button" variant="outline" onClick={onEdit}>
                <Pencil aria-hidden="true" /> Editar
              </Button>
            ) : null}
            {onRepair ? (
              <Button type="button" variant="outline" onClick={onRepair}>
                <Wrench aria-hidden="true" /> Reparar
              </Button>
            ) : null}
            {onRosterSync ? (
              <Button type="button" variant="outline" onClick={onRosterSync}>
                <RefreshCcw aria-hidden="true" /> Sincronizar
              </Button>
            ) : null}
            {onStatusChange ? (
              <Button type="button" variant="outline" onClick={onStatusChange}>
                <Power aria-hidden="true" />
                {duty.isActive ? 'Desactivar' : 'Reactivar'}
              </Button>
            ) : null}
            {duty.configurationStatus === 'VALID' && onShare ? (
              <Button type="button" onClick={onShare}>
                <Share2 aria-hidden="true" /> Compartir planificación
              </Button>
            ) : null}
          </div>
          {duty.configurationStatus !== 'VALID' ? (
            <div className="dutyRotations-invalidConfiguration" role="status">
              <AlertTriangle aria-hidden="true" />
              <div>
                <strong>Configuración incompatible</strong>
                <p>
                  Puedes inspeccionar el historial, pero no generar ni compartir
                  nuevos turnos hasta corregir esta actividad.
                </p>
              </div>
            </div>
          ) : null}
          <Tabs
            value={activeTab}
            onValueChange={value =>
              onTabChange(value === 'history' ? 'history' : 'upcoming')
            }
            className="dutyRotations-planningTabs"
          >
            <TabsList>
              <TabsTrigger value="upcoming">Próximas</TabsTrigger>
              <TabsTrigger value="history">
                <History aria-hidden="true" /> Historial
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <PlanningState
                duty={duty}
                query={upcoming}
                currentDate={currentDate}
                emptyMessage="El horizonte actual no contiene turnos futuros."
                onManageAbsences={onManageAbsences}
              />
            </TabsContent>
            <TabsContent value="history">
              <PlanningState
                duty={duty}
                query={history}
                currentDate={currentDate}
                emptyMessage="No hay turnos históricos en los últimos 90 días."
              />
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </SheetContent>
  </Sheet>
);

export default DutyPlanningPanel;
