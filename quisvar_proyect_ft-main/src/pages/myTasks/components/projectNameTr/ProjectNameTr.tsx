import TaskSelectViewTotal from '../../pages/listPersonalTask/components/taskSelectViewTotal/TaskSelectViewTotal';
import './projectNameTr.css';

interface ProjectNameTrProps {
  projectName: string;
  stagePrice?: number;
}
const ProjectNameTr = ({ projectName, stagePrice }: ProjectNameTrProps) => {
  return (
    <tr>
      <th colSpan={4}>
        <h2 className="projectNameTr-title">{projectName}</h2>
        {stagePrice !== undefined && (
          <div className="projectNameTr-price">
            <TaskSelectViewTotal
              cost={stagePrice}
              label="TECHO ASIGNADO DE LA ETAPA:"
            />
          </div>
        )}
      </th>
    </tr>
  );
};

export default ProjectNameTr;
