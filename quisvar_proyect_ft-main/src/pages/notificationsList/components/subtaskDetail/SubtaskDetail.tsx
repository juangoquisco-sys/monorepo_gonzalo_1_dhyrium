import { useNavigate } from 'react-router-dom';
import type { ReviewList } from '@/types/types';
import type { TypeTask } from '@/types/task.types';
import './subtaskdetail.css';

interface SubtaskDetail {
  onView?: () => void;
  subtask: ReviewList;
}

const SubtaskDetail = ({ subtask }: SubtaskDetail) => {
  const firstAssignedUser = subtask?.users.at(0);
  const navigate = useNavigate();
  const navigateLocation = (
    workAreaId: number,
    taskIdProp: number,
    subTaskIdProp: number,
    subTaskType: TypeTask
  ) => {
    return navigate(`/tareas/${workAreaId}`, {
      state: {
        taskIdProp,
        subTaskIdProp,
        subTaskType,
      },
      replace: true,
    });
  };

  const handleNavigate = () => {
    const { indexTask, task, task_lvl_2, task_lvl_3, id } = subtask;
    if (indexTask) {
      navigateLocation(indexTask.workArea.id, indexTask.id, id, 'basictasks');
    }
    if (task) {
      navigateLocation(task.indexTask.workArea.id, task.id, id, 'basictasks');
    }
    if (task_lvl_2) {
      navigateLocation(
        task_lvl_2.task.indexTask.workArea.id,
        task_lvl_2.id,
        id,
        'subtasks'
      );
    }
    if (task_lvl_3) {
      navigateLocation(
        task_lvl_3.task_2.task.indexTask.workArea.id,
        task_lvl_3.id,
        id,
        'subtasks'
      );
    }
  };

  return (
    <div className="subtask-container-main">
      {subtask && (
        <div className="subtask-container">
          <div className="subtask-details-content">
            <h5>
              {/* area */}
              {subtask.indexTask?.workArea.project.name}
              {subtask.task?.indexTask.workArea.project.name}
              {subtask.task_lvl_2?.task.indexTask.workArea.project.name}
              {subtask.task_lvl_3?.task_2.task.indexTask.workArea.project.name}
            </h5>
            <span className="subtask-project">
              {/* area */}
              {subtask.indexTask?.workArea.name}
              {subtask.task?.indexTask.workArea.name}
              {subtask.task_lvl_2?.task.indexTask.workArea.name}
              {subtask.task_lvl_3?.task_2.task.indexTask.workArea.name}
            </span>
            <h5 className="subtask-project">
              <b>
                {subtask.indexTask?.item}
                {subtask.task?.item}
                {subtask.task_lvl_2?.item}
                {subtask.task_lvl_3?.item}
                {subtask.indexTask?.name}
                {subtask.task?.name}
                {subtask.task_lvl_2?.name}
                {subtask.task_lvl_3?.name}
              </b>
            </h5>
          </div>
          <div className="subtask-user">
            <div className="subtask-detail-user">
              <h4>
                {subtask.item} {subtask.name}
              </h4>
              {firstAssignedUser && (
                <h5>
                  {firstAssignedUser.user.profile.firstName}{' '}
                  {firstAssignedUser.user.profile.lastName}
                </h5>
              )}
            </div>
            <button className="subtask-icon" onClick={handleNavigate}>
              <img src="/svg/eye.svg" alt="subtask-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtaskDetail;
