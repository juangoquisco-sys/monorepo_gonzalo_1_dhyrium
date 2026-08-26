import { NavLink, Outlet, useParams } from 'react-router-dom';
import './project.css';
import { PROJECT_OPTIONS } from './models/definitiosProject';
import HeaderOptionBtn from '@/components/headerOption/HeaderOptionBtn';
import { useContext, useEffect } from 'react';
import { ProjectContext } from './context/ProjectContext';
import { axiosInstance } from '@/services/axiosInstance';

export const Project = () => {
  const { resetValues } = useContext(ProjectContext);
  const { stageId } = useParams();

  useEffect(() => {
    resetValues();
  }, []);

  useEffect(() => {
    registerStageVisited();
  }, [stageId]);

  const registerStageVisited = () => {
    axiosInstance.post(`/stages/${stageId}/visit`, null, {
      headers: { noLoader: true },
    });
  };

  return (
    <div className="project">
      <div className="project-options">
        {PROJECT_OPTIONS.map(({ iconOff, iconOn, text, id, navigation }) => (
          <NavLink to={navigation} key={id}>
            {({ isActive }) => (
              <HeaderOptionBtn
                iconOff={iconOff}
                iconOn={iconOn}
                text={text}
                isActive={isActive}
                onClick={() => {
                  resetValues();
                }}
              />
            )}
          </NavLink>
        ))}
      </div>
      <div className="project-content" key={stageId}>
        <Outlet />
      </div>
    </div>
  );
};
