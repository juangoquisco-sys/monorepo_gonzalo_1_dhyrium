import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';
import './kitchen.css';

const Kitchen = () => {
  const { subMenu } = useSubMenus();
  return (
    <div className="kitchen">
      <Navbar title="Alimentación" subMenu={subMenu} />
      <div className="kitchen-main">
        <Outlet />
      </div>
    </div>
  );
};

export default Kitchen;
