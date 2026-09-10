import type { MenuAccess, MenuItem, MenuRole } from '@/types/types';

export interface PermissionRequirement {
  menu: MenuAccess;
  subMenu?: string;
  roles?: MenuRole[];
}

export const hasPermission = (
  menuPoints: MenuItem[] | undefined,
  { menu, subMenu, roles }: PermissionRequirement
) => {
  const menuMatchesRole = (typeRol: string) =>
    !roles || roles.includes(typeRol as MenuRole);

  return (menuPoints ?? []).some(menuPoint => {
    if (menuPoint.route !== menu) return false;
    if (!subMenu) return menuMatchesRole(menuPoint.typeRol);

    return menuPoint.menu?.some(
      item => item.route === subMenu && menuMatchesRole(item.typeRol)
    );
  });
};
