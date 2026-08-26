import type { MenuPoint, MenuRole } from '@/types/types';

export const handleMenu = (
  typeRol: MenuRole | '',
  id: number,
  menus: MenuPoint[]
) => {
  if (!typeRol) {
    const newMenuPoints = menus.filter(menuPoint => menuPoint.menuId !== +id);
    return newMenuPoints;
  }
  const menu: MenuPoint = {
    menuId: +id,
    typeRol,
  };
  const existMenu = menus.some(menu => menu.menuId === +id);

  if (existMenu) {
    const newMenuPoints = menus.map(menuPoint =>
      menuPoint.menuId === +id ? { ...menuPoint, ...menu } : menuPoint
    );
    return newMenuPoints;
  } else {
    return [...menus, menu];
  }
};
