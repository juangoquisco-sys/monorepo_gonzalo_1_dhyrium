import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { SubTask, User } from '@/types/types';
import './taskCard.css';
import {
  OPTION_PROJECT,
  TaskPermission,
  TaskRole,
  taskRolePermissions,
  TaskStatus,
} from '../../../../models/definitiosProject';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import useRole from '@/hooks/useRole';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  useTaskAssignmentContext,
  type TaskAssignmentContext,
} from '@/pages/specialities/hooks/useTaskAssignmentContext';
import { useLocation, useParams } from 'react-router-dom';
import { ProjectRoutes } from '../../../../interface/ProjectRoutes';
import type { ServiceProject } from '../../../../interface/ProjectContex';

interface TaskContextProps {
  task: SubTask;
  hasPermission: (permission: TaskPermission) => boolean;
  handleViewHistory: () => void;
  userInCharge: User | undefined;
  modInCharge: User | undefined;
  viewHistory: boolean;
  assignmentContextQuery: UseQueryResult<TaskAssignmentContext, Error>;
  percentage: number;
  handleSetPercentage: (percentage: number) => void;
  service: ServiceProject;
  stageId?: string;
  userSession: User;
  isUserAndMod: boolean;
}

export const TaskContext = createContext({} as TaskContextProps);

export interface TaskCardProps {
  task: SubTask;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  taskKind?: 'TECHNICAL' | 'BASIC';
}

const TaskCard = ({
  task,
  children,
  className,
  style,
  taskKind = 'TECHNICAL',
}: TaskCardProps) => {
  const userInCharge = task.users?.ACTIVE?.[0]?.user;
  const modInCharge = task?.mods?.[0];

  const { stageId } = useParams();
  const [userPermission, setUserPermission] = useState<null | TaskRole[]>(null);
  const assignmentContextQuery = useTaskAssignmentContext(task.id, taskKind);
  const { state } = useLocation();
  const taskType: ProjectRoutes = state?.taskType || 'budget';
  const [viewHistory, setViewHistory] = useState(state?.viewHistory || false);
  const userSession = useSelector((state: RootState) => state.userSession);
  const { hasAccess: isMod } = useRole('MOD', 'especialidades');

  const handleViewHistory = () => setViewHistory(!viewHistory);

  const hasPermission = (permission: TaskPermission): boolean => {
    if (!userPermission) return false;
    const hasPermision = userPermission.some(role =>
      taskRolePermissions[role]?.[task.status]?.includes(permission)
    );
    return hasPermision;
  };

  useEffect(() => {
    const assignmentContext = assignmentContextQuery.data;
    const isManagerGroup = assignmentContext
      ? assignmentContext.evaluators.some(user => user.id === userSession.id)
      : taskType == ProjectRoutes.basicos
      ? task.managerGroup
      : task.managerGroup?.some(m => m.userId === userSession.id);
    const isModeratorTask = task.mods.some(mod => mod.id === userSession.id);
    const isMemberGroup = assignmentContext?.members.some(
      u => u.id === userSession.id
    );
    const isTechnicalTask = userSession.id === userInCharge?.id;
    const isEvaluatorAndTchnicalTask =
      (isMod || isManagerGroup) && isTechnicalTask;
    if (isEvaluatorAndTchnicalTask) {
      setUserPermission([TaskRole.EVALUADOR, TaskRole.TECNICO]);
    } else if (isMod || isManagerGroup || isModeratorTask) {
      setUserPermission([TaskRole.EVALUADOR]);
    } else if (
      task.status === TaskStatus.UNRESOLVED ? isMemberGroup : isTechnicalTask
    ) {
      setUserPermission([TaskRole.TECNICO]);
    } else {
      setUserPermission([TaskRole.VIZUALIZADOR]);
    }
  }, [
    assignmentContextQuery.data,
    task,
    taskType,
    userInCharge?.id,
    isMod,
    userSession.id,
  ]);

  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const percentageValue = task?.lastFeedback?.percentage;
    if (percentageValue) {
      setPercentage(percentageValue);
    }
  }, [task?.lastFeedback?.percentage]);
  const handleSetPercentage = (percentage: number) => {
    setPercentage(percentage);
  };

  return (
    <TaskContext.Provider
      value={{
        task,
        hasPermission,
        handleViewHistory,
        userInCharge,
        modInCharge,
        viewHistory,
        assignmentContextQuery,
        handleSetPercentage,
        percentage,
        service: OPTION_PROJECT[taskType],
        stageId,
        userSession,
        isUserAndMod:
          userPermission?.length === 2 &&
          userPermission.includes(TaskRole.EVALUADOR) &&
          userPermission.includes(TaskRole.TECNICO),
      }}
    >
      <div className={`cardTask ${className}`} style={style}>
        {children}
      </div>
    </TaskContext.Provider>
  );
};

export default TaskCard;
