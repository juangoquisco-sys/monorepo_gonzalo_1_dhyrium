import { useContext, useMemo, useState } from 'react';
import './tasksSelectView.css';
import { ListPersonalTaskContext } from '../../ListPersonalTaskContext';
import Button from '@/components/button/Button';
import GeneralTitle from '@/components/generalTitle/GeneralTitle';
import InputPercentage from '@/components/Input/InputPercentage';
import PersonalSelectOffice from '../../components/personalSelectOffices/PersonalSelectOffice';
import TaskCardSelect from '../../components/taskCardSelect/TaskCardSelect';
import TaskSelectViewTotal from '../../components/taskSelectViewTotal/TaskSelectViewTotal';

import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { formatUTCDate } from '@/utils/dayjsSpanish';
import { TypeStatus } from '../../interface/listPersonalTask.types';
import { axiosInstance } from '@/services/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { OptionSelect } from '@/types/option.types';

const TasksSelectView = () => {
  const navigate = useNavigate();
  const userSession = useSelector((state: RootState) => state.userSession);
  const { selectTasks, handleSetSearchParams, query, handleResetSelectGlobal } =
    useContext(ListPersonalTaskContext);
  const [percentage, setPercentage] = useState(0);
  const [officeId, setOfficeId] = useState<number | null>(null);
  const handleCancel = () => {
    handleResetSelectGlobal();
    handleSetSearchParams('', 'salaryAdvance');
  };

  const handleSetOffice = (office: OptionSelect) => {
    setOfficeId(+office.value);
  };

  const sumPriceTasks = useMemo(
    () =>
      +(
        selectTasks
          .reduce(
            (acc, task) =>
              +(task.taskInfo.price * (task.percentage / 100)).toFixed(2) + acc,
            0
          )
          .toFixed(2) ?? '0'
      ),
    [selectTasks]
  );

  const partialSumPriceTasks = sumPriceTasks * (+percentage / 100);
  const handleConfirm = async () => {
    if (selectTasks.length <= 0) {
      return SnackbarUtilities.warning('No se ha seleccionado ninguna tarea');
    }
    if (percentage <= 0) {
      return SnackbarUtilities.warning(
        'El porcentaje de adelanto debe ser mayor a 0'
      );
    }
    const ids = selectTasks.map(task => ({
      id: task.id,
      price: task.taskInfo.price * (task.percentage / 100),
      item: task.taskInfo.item,
    }));
    const body = {
      ids,
      userId: userSession.id,
      untilDate: formatUTCDate(query.untilDate),
      initialDate: formatUTCDate(query.initialDate),
      percentage,
      type: TypeStatus[query.salaryAdvance],
      officeId,
    };
    const { data } = await axiosInstance.post('/reports', body);
    navigate(`/mis-reportes/${data.id}`);
  };
  return (
    <div className="tasksSelectView">
      <h3 className="tasksSelectView-title">
        <GeneralTitle firstTitle="Tareas seleccionadas" fontSize={1.125} />
        {selectTasks.length > 0 &&
          `(${selectTasks.length} ${
            selectTasks.length === 1 ? 'tarea' : 'tareas'
          })`}
      </h3>
      <div className="tasksSelectView-list scroll-slim">
        {selectTasks.map(task => (
          <TaskCardSelect key={task.id} task={task} />
        ))}
      </div>

      <div className="tasksSelectView-line" />
      <div className="tasksSelectView-footer">
        <TaskSelectViewTotal cost={sumPriceTasks} label="COSTO PARCIAL" />
        <div className="tasksSelectView-footer-contain">
          <TaskSelectViewTotal label="% de adelanto:">
            <InputPercentage
              value={percentage}
              onChange={setPercentage}
              width={4}
            />
          </TaskSelectViewTotal>
          <TaskSelectViewTotal
            cost={partialSumPriceTasks}
            label="ADELANTO POR COSTO PARCIAL"
          />
        </div>
      </div>
      <div className="tasksSelectView-footer-btn">
        <Button
          textColor="gray"
          text="Cancelar"
          variant="ghost"
          onClick={handleCancel}
        />
        <Button text="Confirmar" onClick={handleConfirm} />
      </div>
      <PersonalSelectOffice onChange={handleSetOffice} />
    </div>
  );
};

export default TasksSelectView;
