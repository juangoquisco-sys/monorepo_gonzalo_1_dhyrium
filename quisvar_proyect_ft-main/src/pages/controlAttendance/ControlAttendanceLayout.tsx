import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';

const ControlAttendanceLayout = () => {
  const { subMenu } = useSubMenus();
  const subMenuOrder = ['registro', 'incidencias', 'reconciliar-faltas'];
  const orderedSubMenu = [...subMenu].sort((a, b) => {
    const aIndex = subMenuOrder.indexOf(String(a.route));
    const bIndex = subMenuOrder.indexOf(String(b.route));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  return (
    <div className="min-h-screen bg-muted/70">
      <Navbar title="Control de asistencia" subMenu={orderedSubMenu} />
      <main className="h-[calc(100vh-var(--navbar-height))] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ControlAttendanceLayout;
