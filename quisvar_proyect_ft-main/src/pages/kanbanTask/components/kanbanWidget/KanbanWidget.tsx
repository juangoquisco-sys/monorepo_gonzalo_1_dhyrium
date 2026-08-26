import { useSortable } from '@dnd-kit/sortable';
import './kanbanWidget.css';
import type { TaskRes } from '../../types/types.response';
import { CSS } from '@dnd-kit/utilities';
import { CiEdit } from 'react-icons/ci';
import { FaSave } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import {
  isOpenCardSelectProject$,
  isOpenCardViewWidget$,
} from '@/services/sharingSubject';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Input from '@/components/Input/Input';
import { useForm } from 'react-hook-form';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import type { Option } from '@/types/types';
interface KanbanWidgetProps {
  task: TaskRes;
  isDragringStyle?: boolean;
  updateTask: (taskId: number, updatedTask: Partial<TaskRes>) => void;
  deleteTask?: (taskId: number) => void;
}
const KanbanWidget = ({
  task,
  updateTask,
  isDragringStyle,
  deleteTask,
}: KanbanWidgetProps) => {
  const [showEdit, setShowEdit] = useState<boolean>(false);
  const [edit, setEdit] = useState<boolean>(false);
  const { handleSubmit, register, watch, reset } = useForm<TaskRes>();
  useEffect(() => {
    if (!task) return;
    reset(task);
  }, [task, reset]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });
  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleViewDetails = () => {
    isOpenCardViewWidget$.setSubject = {
      isOpen: true,
      task,
    };
  };
  const openCardProject = (open: boolean) => {
    isOpenCardSelectProject$.setSubject = {
      isOpen: open,
      id: task.id,
      temporal: false,
    };
  };

  const debounceEdit = useDebounceCallback((value: boolean) => {
    setShowEdit(value);
  }, 300);
  const onSubmit = handleSubmit(data => {
    const updatedFields: Partial<TaskRes> = {};

    if (data.name !== task.name) {
      updatedFields.name = data.name;
    }
    if (data.description !== task.description) {
      updatedFields.description = data.description;
    }
    if (data.projectName !== task.projectName) {
      updatedFields.projectName = data.projectName;
    }

    if (Object.keys(updatedFields).length > 0) {
      updateTask(task.id, updatedFields);
    }

    setEdit(false);
  });
  const dataOptions: Option[] = [
    {
      name: 'Eliminar',
      type: 'button',
      icon: 'trash-red',
      function: () => deleteTask?.(task.id),
    },
  ];

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="kw-container-drag" />;
  }
  return (
    <AppContextMenu data={dataOptions} key={task.id}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`kw-container ${
          isDragringStyle ? 'kw-grabbing' : 'kw-grab'
        } `}
      >
        <div className="kw-input">
          {!showEdit ? (
            <h3
              className="kw-text-title"
              onMouseEnter={() => debounceEdit(true)}
              onMouseLeave={() => debounceEdit(false)}
            >
              {watch('name')}
            </h3>
          ) : (
            <form
              onSubmit={onSubmit}
              className="kw-edit-mode"
              onMouseLeave={() => debounceEdit(false)}
            >
              {edit ? (
                <Input {...register('name')} />
              ) : (
                <h3
                  className="kw-text-hover"
                  onDoubleClick={e => {
                    e.stopPropagation();
                  }}
                  onClick={handleViewDetails}
                >
                  {watch('name')}
                </h3>
              )}
              <button
                className="kw-icon"
                onClick={() => setEdit(!edit)}
                type={!edit ? 'submit' : 'button'}
              >
                {!edit ? <CiEdit /> : <FaSave />}
              </button>
              {/* <span className="kw-icon">
              <BiDotsVerticalRounded />
            </span> */}
            </form>
          )}
        </div>
        <div className="kw-description">
          <p className="kw-text-description">{watch('description')}</p>
        </div>
        <div className="kw-project-content">
          <h3
            className="kw-project-text"
            onClick={task.projectName ? undefined : () => openCardProject(true)}
          >
            {task.projectName ? task.projectName : 'Agregar proyecto'}
          </h3>
          {/* <CardSelectProject taskId={task.id} project={task.projectName}/> */}
        </div>
        {/* <div className="kw-time-content">
        <div className="kw-time">
          <CiClock2 /> Hora inicio
        </div>
        <div className="kw-duration">2 h : 30 min</div>
      </div> */}
      </div>
    </AppContextMenu>
  );
};

export default KanbanWidget;
