import type { Level, SubTask } from '@/types/types';
import './levelSubtask.css';
import LevelItemSubtaskGeneral from '../levelItemSubtask/LevelItemSubtaskGeneral';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import CustomSwitch from '@/components/customSwitch/CustomSwitch';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { ProjectContext } from '../../context/ProjectContext';
import { ProjectRole } from '../../models/definitiosProject';
import AddLevelTask from '../addLevelTask/AddLevelTask';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { transformUniqueDataForName } from '@/utils/tools';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';

interface LevelSutaskProps {
  level: Level;
}
const LevelSubtaskGeneral = ({ level }: LevelSutaskProps) => {
  const { hasPermission, service, stageId, dayTask, levels } =
    useContext(ProjectContext);

  const { subTasks, id: levelId } = level;
  const [data, setData] = useState<SubTask[]>(subTasks);
  const isAddCount = useRef(0);

  const { emitWithLoader, socket } = useEmitWithLoader();

  useEffect(() => {
    let uniqueTasks;
    if (isAddCount.current > 0) {
      uniqueTasks = transformUniqueDataForName([...subTasks, ...data]);
      isAddCount.current -= 1;
    } else {
      uniqueTasks = subTasks;
    }
    setData(uniqueTasks);
  }, [subTasks]);

  const [activeElem, setActiveElem] = useState<SubTask | null>(null);
  const [editOrder, setEditOrder] = useState<boolean>(false);
  const itemsId = useMemo(() => data?.map(item => item.id), [data]);

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Subtask')
      setActiveElem(event.active.data.current.subtask);
  };
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeItem = active.id;
    const overItem = over.id;
    if (activeItem === overItem) return;
    setData(values => {
      const activeItemIndex = values?.findIndex(e => e.id === activeItem);
      const overItemIndex = values?.findIndex(e => e.id === overItem);
      return arrayMove(values, activeItemIndex, overItemIndex);
    });
  };
  const handleOrder = () => {
    const _data = data.map(({ id }) => ({ id }));
    const _subtask = subTasks.map(({ id }) => ({ id }));
    if (_data === _subtask) return;
    const dataToSend = _data
      .map(({ id }, index) => ({ id, index }))
      .filter(({ id, index }) => id !== _subtask[index].id)
      .map(({ id, index }) => ({ id, index: index + 1 }));
    socket.emit(service.sortTask, stageId, dataToSend);
  };
  const handleChange = () => {
    if (editOrder) {
      handleOrder();
    }
  };

  const handleDeleteTask = (id: number) => {
    const oldDatata = [...data];
    const newData = data.filter(item => item.id !== id);
    setData(newData);
    emitWithLoader(service.deleteTask, { id, stageId }).catch(() => {
      setData(oldDatata);
    });
  };
  const handleAddTask = (task: SubTask) => {
    isAddCount.current += 1;
    const newTask: SubTask = {
      ...task,
      item: `${level?.item}.${data.length + 1}`,
    };
    const repeatName = data.find(item => item.name === newTask.name);
    if (repeatName) {
      SnackbarUtilities.warning('Ya existe esta tarea');
      return;
    }
    setData([...data, newTask]);
    const { name, price, days } = task;
    const body = {
      name,
      price,
      days,
      levels_Id: levelId,
      stageId,
      index: data.length + 1,
    };
    socket.emit(service.addTask, body);
  };
  return (
    <div className="levelSubtask">
      <div className="levelSubtask-content levelSubtask-header">
        <div className="levelSubtask-item levelSubtask-item--name">
          {hasPermission(ProjectRole.MODERATOR) && !dayTask.isEdit && (
            <CustomSwitch
              isToggle={editOrder}
              onToggle={handleChange}
              onClick={() => setEditOrder(!editOrder)}
            />
          )}
          <div className="levelSubtask-header-title" style={{ marginLeft: 10 }}>
            NOMBRE
          </div>
        </div>
        <div className="levelSubtask-item">
          <div className="levelSubtask-header-title">DIAS </div>
        </div>
        <div className="levelSubtask-item">
          <div className="levelSubtask-header-title">
            {dayTask.isEdit ? 'PRECIO DIARIO' : 'PORCENTAJE'}{' '}
          </div>
        </div>
        <div className="levelSubtask-item">
          <div className="levelSubtask-header-title">PRECIO</div>
        </div>
        <div className="levelSubtask-item">
          <div className="levelSubtask-header-title">ESTADO</div>
        </div>
        <div className="levelSubtask-item">
          <div className="levelSubtask-header-title">USUARIO ASIGNADO</div>
        </div>
      </div>
      <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={itemsId} disabled={!editOrder}>
          {data?.map(subtask => (
            <LevelItemSubtaskGeneral
              //no tocar
              key={`${subtask.name}`}
              levelId={levelId}
              subtask={subtask}
              handleDeleteTask={handleDeleteTask}
              stayPrice={levels?.stayPrice ?? 0}
              isUnique={level.unique}
            />
          ))}
        </SortableContext>
        {createPortal(
          <DragOverlay>
            {activeElem && (
              <LevelItemSubtaskGeneral subtask={activeElem} levelId={levelId} />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
      {hasPermission(ProjectRole.MODERATOR) &&
        !dayTask.isEdit &&
        !level.unique && <AddLevelTask onChange={handleAddTask} />}
    </div>
  );
};

export default LevelSubtaskGeneral;
