import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { useEffect, useRef } from 'react';
import { addBreadcrumb, captureMessage } from '@/lib/frontendLogger';

const ProtectedSystemUser = () => {
  const userSession = useSelector((state: RootState) => state.userSession);
  const location = useLocation();
  const deniedLogKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userSession.id || userSession.isSystemUser) return;

    const attemptedRoute = `${location.pathname}${location.search}${location.hash}`;
    const deniedLogKey = `${attemptedRoute}|systemUser`;
    if (deniedLogKeyRef.current === deniedLogKey) return;
    deniedLogKeyRef.current = deniedLogKey;

    addBreadcrumb({
      type: 'route_forbidden',
      message: `Acceso denegado a ruta de sistema: ${attemptedRoute}`,
      route: attemptedRoute,
      data: {
        required: 'systemUser',
        isSystemUser: false,
      },
    });

    captureMessage({
      type: 'FRONTEND_ROUTE_FORBIDDEN',
      level: 'warning',
      message: `Acceso denegado a ruta de sistema: ${attemptedRoute}`,
      context: {
        attemptedRoute,
        required: 'systemUser',
        isSystemUser: false,
        userId: userSession.id,
        roleId: userSession.role?.id,
        roleName: userSession.role?.name,
      },
    });
  }, [
    location.hash,
    location.pathname,
    location.search,
    userSession.id,
    userSession.isSystemUser,
    userSession.role?.id,
    userSession.role?.name,
  ]);

  if (!userSession.id) return null;

  if (!userSession.isSystemUser) {
    SnackbarUtilities.warning('No tiene permisos para acceder');
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
};

export default ProtectedSystemUser;
