import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';
import './dutyRotations.css';

const DutyRotationsLayout = () => {
  const { subMenu } = useSubMenus();

  return (
    <div className="dutyRotationsLayout">
      <Navbar title="Rotaciones" subMenu={subMenu} />
      <Outlet />
    </div>
  );
};

export default DutyRotationsLayout;
