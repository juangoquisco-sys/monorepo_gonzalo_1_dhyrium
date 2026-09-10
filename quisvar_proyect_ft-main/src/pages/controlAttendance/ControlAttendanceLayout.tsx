import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';
import type { MenuAccess, MenuRole, SubMenu } from '@/types/types';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { hasPermission } from '@/utils/permissionAccess';

interface DirectiveShortcut extends SubMenu {
  permission: {
    menu: MenuAccess;
    roles?: MenuRole[];
  };
}

const DIRECTIVE_MODULE_SHORTCUTS: DirectiveShortcut[] = [
  {
    id: 'factura-personalizada',
    route: '/factura',
    title: 'Factura personalizada',
    permission: { menu: 'factura', roles: ['MOD'] },
  },
  {
    id: 'comidas',
    route: '/cocina',
    title: 'Comidas',
    permission: { menu: 'cocina' },
  },
  {
    id: 'rotaciones',
    route: '/rotaciones',
    title: 'Rotaciones',
    permission: { menu: 'rotaciones' },
  },
  {
    id: 'control-puerta',
    route: '/control-puerta',
    title: 'Control de puerta',
    permission: { menu: 'control-puerta' },
  },
];

const ControlAttendanceLayout = () => {
  // This layout is rendered inside Centro de usuarios. Ask explicitly for the
  // attendance menu so its internal tabs are not replaced by the parent menu.
  const { subMenu } = useSubMenus('control-asistencia');
  const menuPoints = useSelector(
    (state: RootState) => state.userSession.role?.menuPoints
  );
  const subMenuOrder = [
    'registro',
    'salidas',
    'incidencias',
    'reconciliar-faltas',
  ];
  const canAccessDepartures = hasPermission(menuPoints, {
    menu: 'tramites',
    subMenu: 'salidas',
  });
  const attendanceSubMenu: SubMenu[] = [
    ...subMenu.filter(item => String(item.route) !== 'salidas'),
    ...(canAccessDepartures
      ? [
          {
            id: 'salidas',
            route: 'salidas' as unknown as SubMenu['route'],
            title: 'Salidas',
          },
        ]
      : []),
  ];
  const orderedSubMenu = attendanceSubMenu.sort((a, b) => {
    const aIndex = subMenuOrder.indexOf(String(a.route));
    const bIndex = subMenuOrder.indexOf(String(b.route));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
  const directiveSubMenu = [
    ...orderedSubMenu,
    ...DIRECTIVE_MODULE_SHORTCUTS.filter(shortcut =>
      hasPermission(menuPoints, shortcut.permission)
    ),
  ];

  return (
    <div className="min-h-screen bg-muted/70">
      <Navbar title="Cumplimiento de directivas" subMenu={directiveSubMenu} />
      <main className="h-[calc(100vh-var(--navbar-height))] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ControlAttendanceLayout;
