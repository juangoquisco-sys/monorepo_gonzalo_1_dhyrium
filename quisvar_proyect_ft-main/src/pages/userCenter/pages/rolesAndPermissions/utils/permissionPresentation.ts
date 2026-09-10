import type { Menu, MenuRoleForm, Roles } from '@/types/types';

const PROCEDURES_MENU_ID = 2;
const DIRECTIVE_MENU_ID = 4;
const DEPARTURES_SUBMENU_ID = 4;
const PAYROLL_SUBMENU_ID = 5;
const PAYROLL_DISPLAY_ID = 2005;

type PresentableMenu = Menu | MenuRoleForm;

const byPresentationOrder = (first: PresentableMenu, second: PresentableMenu) =>
  (first.presentation?.order ?? first.id * 10) -
  (second.presentation?.order ?? second.id * 10);

export const buildAlignedPermissionMenus = <T extends PresentableMenu>(
  source: T[]
): T[] => {
  const menus = source.map(menu => ({
    ...menu,
    menu: menu.menu?.map(item => ({ ...item })),
  })) as T[];
  const procedures = menus.find(menu => menu.id === PROCEDURES_MENU_ID);
  const directives = menus.find(menu => menu.id === DIRECTIVE_MENU_ID);
  const departures = procedures?.menu?.find(
    item => item.id === DEPARTURES_SUBMENU_ID
  );
  const payroll = procedures?.menu?.find(item => item.id === PAYROLL_SUBMENU_ID);

  if (procedures?.menu) {
    procedures.menu = procedures.menu.filter(
      item =>
        item.id !== DEPARTURES_SUBMENU_ID && item.id !== PAYROLL_SUBMENU_ID
    );
  }

  if (directives && departures) {
    directives.menu = [
      ...(directives.menu ?? []),
      {
        ...departures,
        storage: {
          menuId: PROCEDURES_MENU_ID,
          subMenuId: DEPARTURES_SUBMENU_ID,
        },
      },
    ].sort(byPresentationOrder);
  }

  if (payroll) {
    menus.push({
      ...payroll,
      id: PAYROLL_DISPLAY_ID,
      storage: {
        menuId: PROCEDURES_MENU_ID,
        subMenuId: PAYROLL_SUBMENU_ID,
      },
      presentation: {
        ...(payroll.presentation ?? {
          group: 'users',
          placements: ['user-center', 'sidebar'],
        }),
        order: 45,
      },
    } as T);
  }

  return menus.sort(byPresentationOrder);
};

export const buildAlignedRoles = (roles: Roles[]) =>
  roles.map(role => ({
    ...role,
    menuPoints: buildAlignedPermissionMenus(role.menuPoints),
  }));
