import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { formatJustDayUtc } from '@/utils/dayjsSpanish';
import type { KanbanTaskRes, TaskRes } from '../../types/types.response';
import KanbanWidget from '../kanbanWidget/KanbanWidget';
// import { CSS } from '@dnd-kit/utilities';
import './kanbanColumn.css';
import { MdOutlineAddTask } from 'react-icons/md';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
interface KanbanColumnProps {
  column: Pick<KanbanTaskRes, 'id' | 'date' | 'title' | 'isActive'>;
  tasks: KanbanTaskRes['tasks'];
  addTask: (newTask: Partial<TaskRes>) => void;
  updateTask: (taskId: number, updatedTask: Partial<TaskRes>) => void;
  deleteTask: (taskId: number) => void;
}
const KanbanColumn = ({
  column: Column,
  tasks,
  addTask,
  updateTask,
  deleteTask,
}: KanbanColumnProps) => {
  const { id } = useSelector((state: RootState) => state.userSession);
  const taskId = useMemo(() => tasks?.map(({ id }) => id), [tasks]);
  // console.log(taskId)
  const {
    setNodeRef,
    attributes,
    listeners,
    // transform,
    // transition,
    // isDragging,
  } = useSortable({
    id: Column.id,
    data: {
      type: 'Column',
      Column,
    },
    disabled: true,
  });
  // const style = {
  //   transition,
  //   transform: CSS.Transform.toString(transform),
  // };
  // if (isDragging) {
  //   return <div ref={setNodeRef} style={style} className="kw-container-drag" />;
  // }
  const handleAddTask = () => {
    const newTask = {
      name: 'Nueva tarea',
      createdAt: Column.date,
      order: tasks.length + 1,
      userId: id,
      description: '',
    };
    addTask(newTask);
  };
  return (
    <div className="kc-container">
      <div className="kc-header">
        <span className={`kc-day-number ${Column.isActive && 'kc-bg-active'}`}>
          {formatJustDayUtc(Column.date)}
        </span>
        <h3 className={`kc-day-text ${Column.isActive && 'kc-active'}`}>
          {Column.title}
        </h3>
      </div>
      <span className="kc-add" onClick={handleAddTask}>
        <MdOutlineAddTask /> Añadir tarea
      </span>
      <div
        className="kc-widget-container"
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        <SortableContext items={taskId}>
          {tasks?.map(task => (
            <KanbanWidget
              key={task.id}
              task={task}
              updateTask={updateTask}
              deleteTask={deleteTask}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
