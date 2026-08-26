import Button from '@/components/button/Button';
import { SortableContext } from '@dnd-kit/sortable';
import { useMemo } from 'react';
import Child2 from './Child';

// import type { Group } from '../../../../types';
type newTasks = {
  id: number;
  text: string;
  time: number;
  refId: number;
};
type Obj = {
  id: number;
  text: string;
  tasks?: newTasks[];
};
interface ItemsProps {
  // item: Group;
  tasks: newTasks[];
  addTask: (id: number) => void;
  item: Obj;
}
const ItemsValues = ({ item, addTask, tasks }: ItemsProps) => {
  const taskIds = useMemo(() => tasks?.map(task => task.id), [item]) ?? [];
  return (
    <div className="ele">
      <div className="task-content">
        <SortableContext items={taskIds}>
          {tasks?.map(task => (
            <Child2 key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
      <Button text="Agregar" onClick={() => addTask?.(item.id)} />
    </div>
  );
};

export default ItemsValues;
