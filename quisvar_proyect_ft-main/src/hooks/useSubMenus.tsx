import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { MenuAccess } from '@/types/types';
import { useLocation } from 'react-router-dom';

const ROTACIONES_SUBMENU_ORDER: Record<string, number> = {
  'mis-turnos': 1,
  'reporte-operativo': 2,
  configuracion: 3,
};

const useSubMenus = (menu: MenuAccess | null = null) => {
  const location = useLocation();
  const currentUrl = menu ?? (location.pathname.split('/')[1] as MenuAccess);
  const { role } = useSelector((state: RootState) => state.userSession);

  const menuPoints =
    role?.menuPoints.filter(menuPoint => menuPoint.route === currentUrl) ?? [];
  const subMenu = [
    ...new Map(
      (menuPoints.flatMap(menuPoint => menuPoint.menu ?? []) ?? [])
        .filter(subMenuPoint => !subMenuPoint.noView)
        .filter(subMenuPoint => !!subMenuPoint.route)
        .filter(
          subMenuPoint =>
            currentUrl !== 'tramites' || subMenuPoint.route !== 'planilla'
        )
        .map(subMenuPoint => [subMenuPoint.route, subMenuPoint])
    ).values(),
  ];
  if (currentUrl === 'rotaciones') {
    subMenu.sort(
      (first, second) =>
        (ROTACIONES_SUBMENU_ORDER[first.route] ?? 99) -
        (ROTACIONES_SUBMENU_ORDER[second.route] ?? 99)
    );
  }
  return { subMenu };
};

export default useSubMenus;
