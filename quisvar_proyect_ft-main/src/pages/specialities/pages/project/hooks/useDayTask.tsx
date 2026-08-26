import { useCallback, useState } from 'react';
import type {
  DayTask,
  DayTaskBody,
  ServiceProject,
} from '../interface/ProjectContex';
import { INITIAL_VALUES_EDIT } from '../models/definitiosProject';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';
import type { Level } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface UseDayTaskProps {
  service: ServiceProject;
  levels: Level | null;
}
// let numRowTask = 2;

const useDayTask = ({ service, levels }: UseDayTaskProps) => {
  // --------------------------------------------------------------------------
  // monthlyCost
  const initMonthlyPrice = String(levels?.monthlyPrice ?? 0);
  const [monthlyPrice, setMonthlyPrice] = useState(initMonthlyPrice);
  //numRowTask

  const handleSetMonthlyPrice = (value: string) => {
    setMonthlyPrice(value);
  };
  // --------------------------------------------------------------------------

  const { emitWithLoader } = useEmitWithLoader();
  const [dayTask, setDayTask] = useState<DayTask>(INITIAL_VALUES_EDIT);
  const [dayTaskBody, setDayTaskBody] = useState<DayTaskBody[]>([]);

  const handleIsEditDayTask = useCallback(() => {
    setDayTaskBody([]);
    setDayTask({ ...dayTask, isEdit: !dayTask.isEdit });
  }, [dayTask, dayTaskBody]);

  const addDataTaskBody = useCallback((dayTask: DayTaskBody) => {
    setDayTaskBody(prev => {
      const existDaytask = prev.find(({ id }) => id === dayTask.id);
      if (existDaytask) {
        return prev.map(el => (el.id === dayTask.id ? dayTask : el));
      } else {
        return [...prev, dayTask];
      }
    });
  }, []);

  const handleSaveDaysTask = useCallback(
    async (stageId?: string) => {
      if (!stageId) return;
      const body = {
        stageId: +stageId,
        tasks: dayTaskBody,
        monthlyPrice: +monthlyPrice,
      };
      if (dayTaskBody.length === 0 && monthlyPrice === initMonthlyPrice)
        return handleIsEditDayTask();
      await emitWithLoader(service.updateDay, body);
      SnackbarUtilities.success('Se guardaron correctamente los cambios');
      setDayTaskBody([]);
    },
    [dayTaskBody, handleIsEditDayTask, location.pathname, monthlyPrice]
  );

  const resetValuesTask = () => {
    setDayTask(INITIAL_VALUES_EDIT);
    setDayTaskBody([]);
  };

  return {
    addDataTaskBody,
    handleSaveDaysTask,
    resetValuesTask,
    dayTask,
    handleIsEditDayTask,
    monthlyPrice,
    handleSetMonthlyPrice,
  };
};

export default useDayTask;
