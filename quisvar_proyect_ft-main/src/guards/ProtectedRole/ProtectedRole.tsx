import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { RootState } from '@/store/store.types';
import type { MenuAccess, MenuItem, MenuRole } from '@/types/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { addBreadcrumb, captureMessage } from '@/lib/frontendLogger';

interface ProtectedRoleProps {
  menuAccess: MenuAccess;
  subMenuAccess?: string;
  typeRol?: MenuRole;
}

const ProtectedRole = ({
  menuAccess,
  subMenuAccess,
  typeRol,
}: ProtectedRoleProps) => {
  const [menuPoints, setMenuPoints] = useState<MenuItem[] | null>(null);
  const { role } = useSelector((state: RootState) => state.userSession);
  const location = useLocation();
  const deniedLogKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!role) return;
    setMenuPoints(role.menuPoints);
  }, [role]);

  const isAuthRole = useMemo(() => {
    if (!menuPoints) return undefined;

    if (subMenuAccess) {
      return menuPoints.some(
        menuPoint =>
          menuPoint.route === menuAccess &&
          menuPoint.menu?.some(
            menuPoint =>
              menuPoint.route === subMenuAccess &&
              (!typeRol || menuPoint.typeRol === typeRol)
          )
      );
    }

    return menuPoints.some(
      menuPoint =>
        menuPoint.route === menuAccess &&
        (!typeRol || menuPoint.typeRol === typeRol)
    );
  }, [menuAccess, menuPoints, subMenuAccess, typeRol]);

  useEffect(() => {
    if (!menuPoints || isAuthRole !== false) return;

    const attemptedRoute = `${location.pathname}${location.search}${location.hash}`;
    const deniedLogKey = [
      attemptedRoute,
      menuAccess,
      subMenuAccess || '',
      typeRol || '',
    ].join('|');

    if (deniedLogKeyRef.current === deniedLogKey) return;
    deniedLogKeyRef.current = deniedLogKey;

    const availableMenuPoints = menuPoints.map(menuPoint => ({
      route: menuPoint.route,
      typeRol: menuPoint.typeRol,
      menu: menuPoint.menu?.map(subMenu => ({
        route: subMenu.route,
        typeRol: subMenu.typeRol,
      })),
    }));

    addBreadcrumb({
      type: 'route_forbidden',
      message: `Acceso denegado a ruta protegida: ${attemptedRoute}`,
      route: attemptedRoute,
      data: {
        menuAccess,
        subMenuAccess,
        typeRol,
      },
    });

    captureMessage({
      type: 'FRONTEND_ROUTE_FORBIDDEN',
      level: 'warning',
      message: `Acceso denegado a ruta protegida: ${attemptedRoute}`,
      context: {
        attemptedRoute,
        menuAccess,
        subMenuAccess,
        typeRol,
        roleId: role?.id,
        roleName: role?.name,
        availableMenuPoints,
      },
    });
  }, [
    isAuthRole,
    location.hash,
    location.pathname,
    location.search,
    menuAccess,
    menuPoints,
    role?.id,
    role?.name,
    subMenuAccess,
    typeRol,
  ]);

  if (!menuPoints) return null;

  if (!isAuthRole) {
    SnackbarUtilities.warning('No tiene permisos para acceder');
    return <Navigate to="/home" />;
  }
  return <Outlet />;
};

export default ProtectedRole;
