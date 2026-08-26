import { Outlet } from 'react-router-dom';
import './userCenter.css';
import { HEADER_USER_MODEL } from './models/userModelDef';
import Navbar from '@/components/navbar/Navbar';
import CardOpenFile from './pages/users/views/cardOpenFile/CardOpenFile';

const UserCenter = () => {
  return (
    <div className="userCenter">
      <Navbar title="centro&nbsp;de usuarios" subMenu={HEADER_USER_MODEL} />
      <div className="user-content ">
        <Outlet />
      </div>
      <CardOpenFile />
    </div>
  );
};

export default UserCenter;
