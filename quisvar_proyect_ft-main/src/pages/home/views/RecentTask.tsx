import { useEffect, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import RecentProjectCard from '../components/recentProcess/RecentProjectCard';
import { PiNotepadBold } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import { handleProjectNavigate } from '../../myTasks/tools/projectNavigation';

const RecentTask = () => {
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  useEffect(() => {
    getLastTasks();
  }, []);

  const getLastTasks = async () => {
    const res = await axiosInstance.get<RecentTask[]>('/subtasks/lastVisited');
    setRecentTasks(res.data);
  };

  if (recentTasks.length === 0) return null;
  return (
    <div className="recentProcess-container">
      <p className="recentProcess-title">Tareas visitadas recientemente:</p>
      <div className="recentProcess-cards scroll-slim ">
        {recentTasks.map(task => (
          <RecentProjectCard
            icon={<PiNotepadBold size={21} color={COLOR_CSS.primary} />}
            key={task.id}
            headerText={`${task.levelItem} ${task.levelName}`}
            title={`${task.item} ${task.name}`}
            footerText={task.projectName}
            onCLick={() =>
              handleProjectNavigate(task.projectId, task.stageId, task.id)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default RecentTask;
