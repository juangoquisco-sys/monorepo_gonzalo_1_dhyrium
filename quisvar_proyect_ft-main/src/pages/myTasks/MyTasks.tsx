import { Outlet } from 'react-router-dom';
import './myTasks.css';
import Navbar from '@/components/navbar/Navbar';
import useSubMenus from '@/hooks/useSubMenus';
const MyTasks = () => {
  const { subMenu } = useSubMenus();
  return (
    <div className="myTasks">
      <Navbar title="MIS TAREAS" subMenu={subMenu} />
      <div className="myTasks-main">
        <Outlet />
      </div>
    </div>
  );
};

export default MyTasks;
