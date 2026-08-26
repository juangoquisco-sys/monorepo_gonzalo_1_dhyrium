import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';
import './gateControl.css';

const GateControlLayout = () => {
  const { subMenu } = useSubMenus();

  return (
    <div className="gateControlLayout">
      <Navbar title="Control de puerta" subMenu={subMenu} />
      <Outlet />
    </div>
  );
};

export default GateControlLayout;
