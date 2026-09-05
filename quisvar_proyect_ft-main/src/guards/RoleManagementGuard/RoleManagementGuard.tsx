import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';

export const ROLE_MANAGEMENT_DNIS = new Set([
  '73520253',
  '45574308',
  '78549254',
  '76137511',
]);

const RoleManagementGuard = () => {
  const dni = useSelector((state: RootState) => state.userSession.profile.dni);
  return ROLE_MANAGEMENT_DNIS.has(dni) ? <Outlet /> : <Navigate to="/home" replace />;
};

export default RoleManagementGuard;
