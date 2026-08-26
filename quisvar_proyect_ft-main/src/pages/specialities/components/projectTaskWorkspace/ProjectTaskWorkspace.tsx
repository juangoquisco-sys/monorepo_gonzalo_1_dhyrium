import type { SubTask } from '@/types/types';
import TaskCard from '../../pages/project/pages/task/components/taskCard/TaskCard';
import TaskPrincipal from '../../pages/project/pages/task/View/taskPrincipal/TaskPrincipal';
import '../../pages/project/pages/task/task.css';

interface ProjectTaskWorkspaceProps {
  task: SubTask;
  className?: string;
}

const ProjectTaskWorkspace = ({
  task,
  className = '',
}: ProjectTaskWorkspaceProps) => {
  return (
    <div className={`task ${className}`}>
      <TaskCard task={task} className="h-full">
        <TaskPrincipal />
      </TaskCard>
    </div>
  );
};

export default ProjectTaskWorkspace;
