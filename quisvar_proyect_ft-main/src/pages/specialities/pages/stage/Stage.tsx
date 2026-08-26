import { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import './stage.css';
import type { ProjectType } from '@/types/types';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store.types';
import CardDuplicateFrom from './components/cardDuplicateFrom/CardDuplicateFrom';
import StageAddButton from './components/stageAddButton/StageAddButton';
import StageItem from './components/stageItem/StageItem';
import useRole from '@/hooks/useRole';
import { setModAuthProject } from '@/store/slices/modAuthProject.slice';

export const Stage = () => {
  const [project, setProject] = useState<ProjectType | null>(null);
  const [btnActive, setBtnActive] = useState<boolean>(false);
  const { projectId } = useParams();
  const { hasAccess } = useRole('MOD');
  const { id } = useSelector((state: RootState) => state.userSession);
  const dispatch: AppDispatch = useDispatch();

  const handleBtnActive = () => {
    setBtnActive(!btnActive);
  };
  useEffect(() => {
    if (id) {
      getStages();
    }
    return () => {
      setProject(null);
    };
  }, [projectId, id]);

  const getStages = () => {
    axiosInstance
      .get<ProjectType>(`/projects/${projectId}`, {
        headers: { noLoader: true },
      })
      .then(res => {
        const isModsAuthProject = res.data.hasAccessInStage || hasAccess;
        dispatch(setModAuthProject(isModsAuthProject));
        setProject(res.data);
      });
  };

  return (
    <div className="stage">
      <div className="stage-header">
        {project ? (
          <>
            {project?.stages?.map((stage, i) => (
              <StageItem
                stage={stage}
                i={i}
                key={stage.id}
                getStages={getStages}
              />
            ))}
            {(hasAccess || project.hasAccessInStage) && (
              <>
                {!btnActive ? (
                  <Button
                    icon="add"
                    color="grayLigth"
                    onClick={handleBtnActive}
                  />
                ) : (
                  <StageAddButton
                    stageId={projectId}
                    getStages={getStages}
                    setBtnActive={handleBtnActive}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <LoaderForComponent width={20} />
        )}
      </div>
      <CardDuplicateFrom onSave={getStages} />
      <Outlet />
    </div>
  );
};
