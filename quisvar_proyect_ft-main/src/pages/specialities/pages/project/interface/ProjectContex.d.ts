import { OPTION_PROJECT } from '../models/definitiosProject';
import { ProjectRoutes } from './ProjectRoutes';
import type { Level } from '@/types/types';
import { ReactNode } from 'react';

// export Interfaces
export interface DayTask {
  isEdit: boolean;
}

export interface SocketProviderProps {
  children: ReactNode;
}

export interface DayTaskBody {
  id: number;
  days: number;
  price: number;
}
// export interface PriceTaskBody {
//   id: number;
//   days: number;
// }
export interface CoverBody {
  id: number;
  cover: boolean;
}

export type ServiceProject = (typeof OPTION_PROJECT)[ProjectRoutes];
export interface ProjecContextType {
  dayTask: DayTask;
  handleIsEditDayTask: () => void;
  addDataTaskBody: (el: DayTaskBody) => void;
  handleSaveDaysTask: (stageId?: string) => void;
  addCoverBody: (el: CoverBody) => void;
  handleSaveCover: (stageId?: string) => void;
  handleIsEditCover: () => void;

  cover: {
    isEdit: boolean;
  };
  resetValues: () => void;

  handleSetMonthlyPrice: (value: string) => void;
  monthlyPrice: string;

  ACTUAL_ROUTE: ProjectRoutes;
  service: ServiceProject;
  hasPermission: (permission: ProjectRole) => boolean;
  handleSetUserPermission: (permission: ProjectRole) => void;
  stageId?: string;

  levels: Level | null;
  setlevels: Dispatch<SetStateAction<Level | null>>;
}
