import type { Level } from '@/types/types';
import './dropdownLevel.css';
import { ProjectAddLevelBasics } from '../projectAddLevel/ProjectAddLevelBasics';
import LevelSubtaskGeneral from '../levelSubtask/LevelSubtaskGeneral';
import { ProjectLevelGeneral } from '../projectLevel/ProjectLevelGeneral';
import { useContext } from 'react';
import { ProjectContext } from '../../context/ProjectContext';
import { ProjectRole } from '../../models/definitiosProject';

interface DropdownLevelGeneral {
  level: Level;
}

export const DropdownLevelGeneral = ({ level }: DropdownLevelGeneral) => {
  const { cover, dayTask, hasPermission } = useContext(ProjectContext);
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
                <ProjectLevelGeneral data={subLevel} />

                <DropdownLevelGeneral level={subLevel} />
              </li>
            ))}
            {hasPermission(ProjectRole.MODERATOR) &&
              !cover.isEdit &&
              !dayTask.isEdit && <ProjectAddLevelBasics data={level} />}
          </>
        )}
      </ul>
    </div>
  );
};

export default DropdownLevelGeneral;
