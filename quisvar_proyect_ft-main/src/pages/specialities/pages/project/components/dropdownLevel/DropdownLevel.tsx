import { useSelector } from 'react-redux';
import type { Level } from '@/types/types';
import './dropdownLevel.css';
import type { RootState } from '@/store/store.types';
import { ProjectAddLevel } from '../projectAddLevel/ProjectAddLevel';
import { ProjectLevel } from '../projectLevel/ProjectLevel';
import LevelSubtaskGeneral from '../levelSubtask/LevelSubtaskGeneral';
import { useContext } from 'react';
import { ProjectContext } from '../../context/ProjectContext';

interface DropdownLevel {
  level: Level;
  onSave?: () => void;
}

export const DropdownLevel = ({ level, onSave }: DropdownLevel) => {
  const modAuthProject = useSelector(
    (state: RootState) => state.modAuthProject
  );
  const { dayTask } = useContext(ProjectContext);

  const userSessionId = useSelector((state: RootState) => state.userSession.id);

  const modAuthArea = modAuthProject || userSessionId === level.userId;
  const firstLevel = !level.level;
  const existSubtask = level?.subTasks?.length;
  if (level.level === 10) return <div></div>;
  return (
    <div className="dropdownLevel-dropdown-content">
      <ul
        className={
          firstLevel ? 'dropdownLevel-dropdown' : 'dropdownLevel-dropdown-sub'
        }
      >
        {existSubtask ? (
          <LevelSubtaskGeneral level={level} />
        ) : (
          <>
            {level?.nextLevel?.map(subLevel => (
              <li
                key={subLevel.id}
                className={
                  firstLevel
                    ? 'dropdownLevel-dropdown-list'
                    : 'dropdownLevel-dropdown-sub-list'
                }
              >
                <ProjectLevel data={subLevel} onSave={onSave} />
                <DropdownLevel level={subLevel} onSave={onSave} />
              </li>
            ))}
            {modAuthArea && !dayTask.isEdit && (
              <ProjectAddLevel data={level} onSave={onSave} />
            )}
          </>
        )}
      </ul>
    </div>
  );
};

export default DropdownLevel;
