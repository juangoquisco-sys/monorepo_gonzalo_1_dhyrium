import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar/Navbar';
import type { SubMenu } from '@/types/types';
import {
  SystemHeaderActionContext,
  type SystemHeaderAction,
} from './SystemHeaderActionContext';

const systemSubMenus: SubMenu[] = [
  {
    id: 'health',
    route: 'health',
    title: 'Estado',
  },
  {
    id: 'socket-users',
    route: 'socket-users',
    title: 'Conectados',
  },
  {
    id: 'audit-logs',
    route: 'audit-logs',
    title: 'Auditoria',
  },
  {
    id: 'frontend-logs',
    route: 'frontend-logs',
    title: 'Logs Frontend',
  },
];

const SystemLayout = () => {
  const [headerAction, setHeaderAction] = useState<SystemHeaderAction | null>(
    null
  );

  const headerActionContextValue = useMemo(
    () => ({
      setHeaderAction,
    }),
    []
  );

  return (
    <div className="min-h-screen bg-muted/70">
      <Navbar
        title="Sistema"
        subMenu={systemSubMenus}
        component={
          headerAction ? (
            <Button
              type="button"
              variant="outline"
              disabled={headerAction.disabled || headerAction.isLoading}
              onClick={headerAction.onClick}
            >
              {headerAction.isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {headerAction.label || 'Actualizar'}
            </Button>
          ) : null
        }
      />
      <SystemHeaderActionContext.Provider value={headerActionContextValue}>
        <main className="h-[calc(100vh-var(--navbar-height))] overflow-y-auto">
          <Outlet />
        </main>
      </SystemHeaderActionContext.Provider>
    </div>
  );
};

export default SystemLayout;
