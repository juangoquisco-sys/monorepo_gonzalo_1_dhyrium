import { createContext, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ProjectRoutes } from '../interface/ProjectRoutes';
import { OPTION_PROJECT, ProjectRole } from '../models/definitiosProject';
import type {
  ProjecContextType,
  SocketProviderProps,
} from '../interface/ProjectContex';
import useCoverProject from '../hooks/useCoverProject';
import useDayTask from '../hooks/useDayTask';
import type { Level } from '@/types/types';

// Context
export const ProjectContext = createContext({} as ProjecContextType);

export const ProjectProvider = ({ children }: SocketProviderProps) => {
  const { stageId } = useParams();
  const [levels, setlevels] = useState<Level | null>(null);

  const [userPermission, setUserPermission] = useState<null | ProjectRole>(
    null
  );
  const hasPermission = (permission: ProjectRole): boolean => {
    if (!userPermission) return false;
    const hasPermision = userPermission === permission;
    return hasPermision;
  };

  const handleSetUserPermission = (permission: ProjectRole) => {
    setUserPermission(permission);
  };

  const location = useLocation();
  const onActualRoute = (): ProjectRoutes => {
    const path = location.pathname.split('/');
    const isBudget = path.includes('presupuestos');
    const isBasic = path.includes('basicos');
    if (isBudget) {
      return ProjectRoutes.presupuestos;
    } else if (isBasic) {
      return ProjectRoutes.basicos;
    }
    return ProjectRoutes.presupuestos;
  };
  const ACTUAL_ROUTE = onActualRoute();
  const service = OPTION_PROJECT[ACTUAL_ROUTE];

  const dayTask = useDayTask({ service, levels });
  const cover = useCoverProject({ service });

  const resetValues = () => {
    dayTask.resetValuesTask();
    cover.resetValuesCover();
  };

  return (
    <ProjectContext.Provider
      value={{
        ...dayTask,
        ...cover,
        resetValues,
        ACTUAL_ROUTE,
        service,
        hasPermission,
        handleSetUserPermission,
        stageId,
        levels,
        setlevels,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
