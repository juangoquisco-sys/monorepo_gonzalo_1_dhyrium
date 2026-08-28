import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';
import type { SubMenu } from '@/types/types';

const ControlAttendanceLayout = () => {
  // This layout is rendered inside Centro de usuarios. Ask explicitly for the
  // attendance menu so its internal tabs are not replaced by the parent menu.
  const { subMenu } = useSubMenus('control-asistencia');
  const subMenuOrder = [
    'registro',
    'salidas',
    'incidencias',
    'reconciliar-faltas',
  ];
  const attendanceSubMenu: SubMenu[] = [
    ...subMenu.filter(item => item.route !== 'salidas'),
    { id: 'salidas', route: 'salidas', title: 'Salidas' },
  ];
  const orderedSubMenu = attendanceSubMenu.sort((a, b) => {
    const aIndex = subMenuOrder.indexOf(String(a.route));
    const bIndex = subMenuOrder.indexOf(String(b.route));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  return (
    <div className="min-h-screen bg-muted/70">
      <Navbar title="Cumplimiento de directivas" subMenu={orderedSubMenu} />
      <main className="h-[calc(100vh-var(--navbar-height))] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ControlAttendanceLayout;
