import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { MenuAccess, MenuRole, Role } from '@/types/types';
import { useLocation } from 'react-router-dom';

const useRole = (
  typeRol: MenuRole,
  menu?: MenuAccess | null,
  subMenu?: string,
  roleData: Role | null = null
) => {
  const location = useLocation();
  const currentUrl = menu ?? (location.pathname.split('/')[1] as MenuAccess);

  const { role } = useSelector((state: RootState) => state.userSession);

  const roleAux = roleData ?? role;
  let hasAccess: boolean | undefined = false;
  if (subMenu) {
    const findMenu = roleAux?.menuPoints.find(
      menuPoint => menuPoint.route === currentUrl
    );
    hasAccess = findMenu?.menu?.some(
      menuPoint => menuPoint.route === subMenu && menuPoint.typeRol === typeRol
    );
  } else {
    hasAccess = roleAux?.menuPoints.some(
      menuPoint =>
        menuPoint.route === currentUrl && menuPoint.typeRol === typeRol
    );
  }

  return { hasAccess: !!hasAccess };
};

export default useRole;
