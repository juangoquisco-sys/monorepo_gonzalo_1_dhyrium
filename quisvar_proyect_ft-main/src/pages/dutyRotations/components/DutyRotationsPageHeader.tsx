import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelpTooltip from './HelpTooltip';

interface DutyRotationsPageHeaderProps {
  title?: string;
  description: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  action?: ReactNode;
}

const DutyRotationsPageHeader = ({
  title = 'Rotacion de responsabilidades',
  description,
  refreshing = false,
  onRefresh,
  action,
}: DutyRotationsPageHeaderProps) => (
  <div className="dutyRotations-header">
    <div>
      <div className="dutyRotations-titleLine">
        <h1>{title}</h1>
        <HelpTooltip text="Este modulo organiza tareas recurrentes, asigna responsables por periodo y permite completar, cambiar o tomar turnos disponibles." />
      </div>
      <p>{description}</p>
    </div>
    {action ??
      (onRefresh ? (
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          title="Vuelve a consultar tus turnos, responsabilidades habilitadas y turnos disponibles desde el servidor."
        >
          <RefreshCw />
          Actualizar
        </Button>
      ) : null)}
  </div>
);

export default DutyRotationsPageHeader;
