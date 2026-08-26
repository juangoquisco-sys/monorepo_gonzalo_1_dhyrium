import {
  MoneyCalculator24Regular,
  ReceiptMoney24Regular,
} from '@fluentui/react-icons';
import { NavLink, Outlet } from 'react-router-dom';

import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { cn } from '@/lib/utils';
import { RECAUDADOR_GRANDE_ROUTES } from './recaudadorGrande.constants';

const tabClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors',
    isActive
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
  );

export const RecaudadorGrandeLayout = () => (
  <AppPageShell className="flex h-full flex-col overflow-hidden bg-background">
    <header className="border-b border-border bg-card px-4 pt-3">
      <div className="mb-2 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Mis tareas técnicas
          </p>
          <h1 className="truncate text-xl font-bold text-foreground">
            Recaudador Grande
          </h1>
          <p className="text-sm text-muted-foreground">
            Conformidad técnica y solicitudes de liquidación.
          </p>
        </div>
      </div>
      <nav aria-label="Secciones de Recaudador Grande" className="flex gap-1">
        <NavLink
          className={tabClassName}
          to={RECAUDADOR_GRANDE_ROUTES.preLiquidation}
        >
          <MoneyCalculator24Regular aria-hidden />
          Pre-liquidación
        </NavLink>
        <NavLink
          className={tabClassName}
          to={RECAUDADOR_GRANDE_ROUTES.liquidation}
        >
          <ReceiptMoney24Regular aria-hidden />
          Nueva liquidación
        </NavLink>
      </nav>
    </header>
    <div className="min-h-0 flex-1 overflow-auto">
      <Outlet />
    </div>
  </AppPageShell>
);
