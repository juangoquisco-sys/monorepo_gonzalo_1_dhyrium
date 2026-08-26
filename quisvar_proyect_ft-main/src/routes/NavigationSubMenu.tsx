import { Navigate } from 'react-router-dom';
import useSubMenus from '@/hooks/useSubMenus';
import type { MenuAccess } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface NavigationSubMenuProps {
  menu?: MenuAccess;
}

const NavigationSubMenu = ({ menu }: NavigationSubMenuProps) => {
  const { subMenu } = useSubMenus(menu);
  if (subMenu.length !== 0) {
    return <Navigate to={subMenu[0].route} replace />;
  } else {
    SnackbarUtilities.warning('No tiene permisos para acceder');
    return <Navigate to={'/home'} replace />;
  }
};

export default NavigationSubMenu;
