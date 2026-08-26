import { useContext } from 'react';
import IconActionExtend from '@/components/iconAction/IconActionExtend';
import { useParams } from 'react-router-dom';
import { ProjectContext } from '../../context/ProjectContext';

const DaysTaskEdit = () => {
  const { stageId } = useParams();
  const { handleIsEditDayTask, dayTask, handleSaveDaysTask } =
    useContext(ProjectContext);
  return (
    <IconActionExtend
      iconPrimary={dayTask.isEdit ? 'icon_save' : 'day-edit'}
      fontWeightPrimary={dayTask.isEdit ? '600' : '500'}
      onClickPrimary={
        dayTask.isEdit ? () => handleSaveDaysTask(stageId) : handleIsEditDayTask
      }
      onClickSecondary={handleIsEditDayTask}
      textPrimary={
        dayTask.isEdit ? 'Guardar Presupuesto' : 'Editar Presupuesto'
      }
      viewIconSecondary={dayTask.isEdit}
    />
  );
};

export default DaysTaskEdit;
