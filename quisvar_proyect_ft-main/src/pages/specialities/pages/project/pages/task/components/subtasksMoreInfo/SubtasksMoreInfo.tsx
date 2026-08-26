import type { SubTask } from '@/types/types';
import { _date } from '@/utils/formatDate';
import StatusText from '@/pages/specialities/components/taskStatusText/TaskStatusText';
import './subtasksMoreInfo.css';
interface SubtasksMoreInfoProps {
  task: SubTask;
}
const SubtasksMoreInfo = ({ task }: SubtasksMoreInfoProps) => {
  // const getTimeOut = () => {
  //   let firsDate;
  //   let lastDate;
  //   // if (task.status === 'DONE' || task.status === 'LIQUIDATION') {
  //   //   const getTaskAproved = task.feedBacks
  //   //     .filter(arr => arr.status)
  //   //     .reduce((acc, arr) => (arr.id > acc.id ? arr : acc), {
  //   //       id: 0,
  //   //     }) as Feedback;
  //   //   firsDate = new Date(task.users.at(0)?.assignedAt || '');
  //   //   lastDate = new Date(getTaskAproved.updatedAt);
  //   // } else {
  //   //   firsDate = new Date();
  //   //   lastDate = new Date(task.users.at(0)?.assignedAt || '');
  //   //   lastDate.setDate(lastDate.getDate() + task.days);
  //   //   if (!firsDate || !firsDate) return 0;
  //   // }

  //   // const untilDateTime = lastDate.getTime() - new Date(firsDate).getTime();
  //   const transformToDays =
  //     Math.floor((untilDateTime / 1000 / 60 / 60 / 24) * 10) / 10;
  //   return transformToDays;
  // };

  return (
    <div className="subtasksMoreInfo">
      <div className="subtasksMoreInfo-item">
        <h3 className="subtasksMoreInfo-item-title">FECHA DE CREACION</h3>
        <div className="subtasksMoreInfo-item-text">
          <figure className="subtasksMoreInfo-item-icon">
            <img src="/svg/date-icon.svg" alt="W3Schools" />
          </figure>
          {task?.createdAt ? _date(task?.createdAt) : '-'}
        </div>
      </div>
      {/* <div className="subtasksMoreInfo-item">
        <h3 className="subtasksMoreInfo-item-title">PRECIO</h3>
        <div className="subtasksMoreInfo-item-text">
          <figure className="subtasksMoreInfo-item-icon">
            <img src="/svg/money-icon.svg" alt="W3Schools" />
          </figure>
          {task.price}
        </div>
      </div> */}
      <div className="subtasksMoreInfo-item">
        <h3 className="subtasksMoreInfo-item-title">FECHA DE INICIO</h3>
        <div className="subtasksMoreInfo-item-text">
          <figure className="subtasksMoreInfo-item-icon">
            <img src="/svg/date-icon.svg" alt="W3Schools" />
          </figure>
          {/* {task.users.at(0)?.untilDate
            ? _date(task.users.at(0)?.untilDate || new Date())
            : '-'} */}
        </div>
      </div>
      <div className="subtasksMoreInfo-item">
        <h3 className="subtasksMoreInfo-item-title">ESTADO ACTUAL</h3>
        <StatusText status={task.status} />
      </div>
      <div className="subtasksMoreInfo-item">
        <h3 className="subtasksMoreInfo-item-title">TOTAL DE DIAS</h3>
        <div className="subtasksMoreInfo-item-text">
          <figure className="subtasksMoreInfo-item-icon">
            <img src="/svg/timer-icon.svg" alt="W3Schools" />
          </figure>
          {task.days}
        </div>
      </div>
      <div className="subtasksMoreInfo-item">
        <h3 className="subtasksMoreInfo-item-title">
          {task.status === 'DONE' || task.status === 'LIQUIDATION'
            ? 'TIEMPO EMPLEADO'
            : 'TIEMPO RESTANTE'}
        </h3>
        <div className="subtasksMoreInfo-item-text">
          <figure className="subtasksMoreInfo-item-icon">
            <img src="/svg/hours-icon.svg" alt="W3Schools" />
          </figure>
          {/* {task.users.length ? getTimeOut() + ' Dias' : '-'} */}
        </div>
      </div>
    </div>
  );
};

export default SubtasksMoreInfo;
