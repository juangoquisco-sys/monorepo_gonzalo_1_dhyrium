import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';

export const useTutorialPermissions = () => {
  const role = useSelector((state: RootState) => state.userSession.role);
  const tutorialPermission = role?.menuPoints.find(
    menuPoint => menuPoint.route === 'tutorials'
  );

  return {
    canManageTutorials: tutorialPermission?.typeRol === 'MOD',
    canViewTutorials:
      tutorialPermission?.typeRol === 'MOD' ||
      tutorialPermission?.typeRol === 'VIEWER',
  };
};
