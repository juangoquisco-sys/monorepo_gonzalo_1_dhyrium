import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './kanbanTask.css';
import { axiosInstance } from '@/services/axiosInstance';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { KanbanTaskRes, TaskRes } from './types/types.response';
import CardSelectProject from './components/cardSelectProject/CardSelectProject';
import KanbanColumn from './components/kanbanColumn/KanbanColumn';
import KanbanWidget from './components/kanbanWidget/KanbanWidget';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import CardViewWidget from './views/cardViewWidget/CardViewWidget';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
interface DataStructure {
  id: number;
  date: string;
  order: number;
}
interface KanbanTaskProps {
  date: string;
}

const KanbanTask = ({ date }: KanbanTaskProps) => {
  const { id } = useSelector((state: RootState) => state.userSession);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTaskRes[]>([]);
  const [activeTask, setActiveTask] = useState<TaskRes | null>(null);
  const [initial, setInitial] = useState<DataStructure[]>([]);
  const [loader, setLoader] = useState<boolean>(false);
  const isFirstRender = useRef(true);
  const columnsId = useMemo(
    () => kanbanTasks.map(({ id }) => id),
    [kanbanTasks]
  );
  const [tasks, setTasks] = useState<TaskRes[]>([]);
  const prepareTaskUpdates = (
    kanbanTasks: KanbanTaskRes[],
    tasks: TaskRes[]
  ) => {
    const taskUpdates: DataStructure[] = [];

    kanbanTasks?.forEach(column => {
      const filteredTasks = tasks.filter(task => task.date === column.id);

      filteredTasks.forEach((task, index) => {
        taskUpdates.push({
          id: task.id,
          date: column.date as string,
          order: index + 1,
        });
      });
    });

    return taskUpdates;
  };
  const getUpdatedItems = (
    initial: DataStructure[],
    update: DataStructure[]
  ) => {
    const initialMap = new Map(initial.map(item => [item.id, item]));
    return update.filter(item => {
      const initialItem = initialMap.get(item.id);
      if (!initialItem) return true;
      return item.date !== initialItem.date || item.order !== initialItem.order;
    });
  };
  const getKanbanTasks = useCallback(() => {
    setLoader(true);
    axiosInstance
      .get<KanbanTaskRes[]>(`operationaltasks/self/${id}?currentDate=${date}`, {
        headers: { noLoader: true },
      })
      .then(res => {
        setKanbanTasks(res.data);
        setTasks(res.data.flatMap(({ tasks }) => tasks));
        setInitial(
          prepareTaskUpdates(
            res.data,
            res.data.flatMap(({ tasks }) => tasks)
          )
        );
        setLoader(false);
      });
  }, [id, date]);
  useEffect(() => {
    getKanbanTasks();
  }, [date]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const taskUpdates = prepareTaskUpdates(kanbanTasks, tasks);
    const newReturn = getUpdatedItems(initial, taskUpdates);
    debouncePosition(newReturn);
    setInitial(taskUpdates);
  }, [tasks, kanbanTasks]);

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
      return;
    }
  };
  const sensor = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    const isOverColumn = over.data.current?.type === 'Column';
    const isOverTask = over.data.current?.type === 'Task';
    setTasks(tasks => {
      const activeIndex = tasks.findIndex(task => task.id === activeId);
      let newTasks = [...tasks];
      if (isOverTask) {
        const overIndex = tasks.findIndex(task => task.id === overId);
        newTasks[activeIndex].date = tasks[overIndex].date;
        newTasks = arrayMove(newTasks, activeIndex, overIndex);
      } else if (isOverColumn) {
        newTasks[activeIndex].date = overId as number;
        newTasks.splice(activeIndex, 1);
        newTasks.push(tasks[activeIndex]);
      }

      return newTasks;
    });
  };
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(task => task.id === activeId);
        const overIndex = tasks.findIndex(task => task.id === overId);
        tasks[activeIndex].date = tasks[overIndex].date;
        return arrayMove(tasks, activeIndex, overIndex);
        // const updatedTasks = arrayMove(tasks, activeIndex, overIndex);
        // setKanbanTasks(prevKanbanTasks => {
        //   return prevKanbanTasks.map(column => {
        //     if (column.id === updatedTasks[overIndex].date) {
        //       return {
        //         ...column,
        //         tasks: updatedTasks.filter(task => task.date === column.id),
        //       };
        //     }
        //     return column;
        //   });
        // });
        // return updatedTasks;
      });
    }
    // This code is for moving tasks between columns :v
    // const isOverColumn = over.data.current?.type === 'Column';
    // if (!isActiveTask && isOverColumn) {
    //   setTasks(tasks => {
    //     console.log('entre tasks');
    //     const activeIndex = tasks.findIndex(task => task.id === activeId);
    //     tasks[activeIndex].date = overId as number;
    //     return  arrayMove(tasks, activeIndex, activeIndex);
    //   });
    // }
  };

  const addTask = (newTask: Partial<TaskRes>) => {
    axiosInstance.post<TaskRes>(`operationaltasks/`, newTask).then(res => {
      const createdTask = res.data;

      setTasks([...tasks, createdTask]);

      setKanbanTasks(prevKanbanTasks => {
        return prevKanbanTasks.map(kanbanTask => {
          if (kanbanTask.id === createdTask.date) {
            return {
              ...kanbanTask,
              tasks: [...kanbanTask.tasks, createdTask],
            };
          }
          return kanbanTask;
        });
      });
    });
  };
  const updateTask = (taskId: number, updatedTask: Partial<TaskRes>) => {
    axiosInstance.put(`operationaltasks/${taskId}`, updatedTask, {
      headers: { noLoader: true },
    });
    const editTask = tasks.map(task =>
      task.id === taskId ? { ...task, ...updatedTask } : task
    );
    setTasks(editTask);
    setKanbanTasks(prevKanbanTasks => {
      return prevKanbanTasks.map(kanbanTask => {
        return {
          ...kanbanTask,
          tasks: kanbanTask.tasks.map(task =>
            task.id === taskId ? { ...task, ...editTask } : task
          ),
        };
      });
    });
  };
  const deleteTask = (taskId: number) => {
    axiosInstance.delete(`operationaltasks/${taskId}`).then(() => {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setKanbanTasks(prevKanbanTasks =>
        prevKanbanTasks.map(kanbanTask => ({
          ...kanbanTask,
          tasks: kanbanTask.tasks.filter(task => task.id !== taskId),
        }))
      );
    });
  };
  const debouncePosition = useDebounceCallback(
    (taskUpdates: { id: number; date: string; order: number }[]) => {
      axiosInstance.patch('operationaltasks/position', taskUpdates, {
        headers: { noLoader: true },
      });
    },
    1000
  );
  if (kanbanTasks.length === 0)
    return (
      <div className="task-loader">
        <LoaderForComponent />
      </div>
    );
  const renderLoader = () => (
    <div className="task-loader">
      <LoaderForComponent />
    </div>
  );

  return loader ? (
    renderLoader()
  ) : (
    <div className="kt-container">
      <DndContext
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        sensors={sensor}
      >
        <div className="kt-table">
          <SortableContext items={columnsId}>
            {kanbanTasks &&
              kanbanTasks.map(({ id, date, isActive, title }) => (
                <KanbanColumn
                  key={id}
                  column={{ id, date, isActive, title }}
                  tasks={tasks.filter(task => task.date === id)}
                  addTask={addTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                />
              ))}
          </SortableContext>
        </div>
        {createPortal(
          <DragOverlay>
            {activeTask && (
              <KanbanWidget
                task={activeTask}
                isDragringStyle={true}
                updateTask={updateTask}
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
      <CardViewWidget updateTask={updateTask} />
      <CardSelectProject updateTask={updateTask} />
    </div>
  );
};

export default KanbanTask;
