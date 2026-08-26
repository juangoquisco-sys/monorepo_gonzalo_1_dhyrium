import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type newTasks = {
  id: number;
  text: string;
  time: number;
  refId: number;
};
interface ChildProps {
  task: newTasks;
}
const Child2 = ({ task }: ChildProps) => {
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
  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="task-item-drag" />;
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-item"
      key={task.id}
    >
      <p>{task.text}</p>
    </div>
  );
};

export default Child2;
