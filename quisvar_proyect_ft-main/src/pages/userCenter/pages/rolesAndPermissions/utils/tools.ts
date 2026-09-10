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

export const handleStoredPermission = (
  typeRol: MenuRole | '',
  menuId: number,
  subMenuId: number | undefined,
  menus: MenuPoint[]
) => {
  if (!subMenuId) return handleMenu(typeRol, menuId, menus);

  const previousMenu = menus.find(menu => menu.menuId === menuId);
  const nextSubMenus = handleMenu(
    typeRol,
    subMenuId,
    previousMenu?.subMenuPoints ?? []
  );

  if (nextSubMenus.length === 0) {
    return menus.filter(menu => menu.menuId !== menuId);
  }

  const parentRole = nextSubMenus.some(menu => menu.typeRol === 'MOD')
    ? 'MOD'
    : nextSubMenus[0].typeRol;
  const nextParent: MenuPoint = {
    ...(previousMenu?.id ? { id: previousMenu.id } : {}),
    menuId,
    typeRol: parentRole,
    subMenuPoints: nextSubMenus,
  };

  return previousMenu
    ? menus.map(menu => (menu.menuId === menuId ? nextParent : menu))
    : [...menus, nextParent];
};
