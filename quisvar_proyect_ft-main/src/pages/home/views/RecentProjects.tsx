import { useEffect, useState } from 'react';
import './recentProcess.css';
import { axiosInstance } from '@/services/axiosInstance';
import RecentProjectCard from '../components/recentProcess/RecentProjectCard';
import { PiGearSixBold } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import { handleProjectNavigate } from '../../myTasks/tools/projectNavigation';

const RecentProjects = () => {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  useEffect(() => {
    getLaststages();
  }, []);

  const getLaststages = async () => {
    const res = await axiosInstance.get<RecentProject[]>('/stages/lastVisited');
    setRecentProjects(res.data);
  };
  if (recentProjects.length === 0) return null;
  return (
    <div className="recentProcess-container">
      <p className="recentProcess-title">Proyectos visitados recientemente:</p>
      <div className="recentProcess-cards scroll-slim ">
        {recentProjects?.map(project => (
          <RecentProjectCard
            icon={<PiGearSixBold size={21} color={COLOR_CSS.primary} />}
            key={project.cui}
            headerText={project.cui.toString()}
            title={project.projectName}
            footerText={project.stageName}
            onCLick={() =>
              handleProjectNavigate(project.projectId, project.stageId)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default RecentProjects;
