import { useForm } from 'react-hook-form';
import type { DutyTasks } from '../../../../types/types.response';
import './membersTasks.css';
import { useEffect, type Dispatch } from 'react';
interface TasksProps {
  tasks: DutyTasks[];
  edit: boolean;
  editTask: Dispatch<React.SetStateAction<DutyTasks[]>>;
}

const MembersTasks = ({ tasks, editTask, edit }: TasksProps) => {
  // console.log(tasks);
  const {
    register,
    // handleSubmit,
    // setValue,
    // control,
    reset,
    // watch,
    // formState: { errors },
  } = useForm<DutyTasks[]>();
  useEffect(() => {
    if (!tasks) return;
    reset({ ...tasks });
  }, [tasks, reset, edit]);
  const handleChange = (idx: number, field: string, value: string | number) => {
    // console.log(idx, field, value);
    if (!value) return;
    const updatedTasks = [...tasks];
    updatedTasks[idx] = {
      ...updatedTasks[idx],
      [field]: value,
    };
    editTask(updatedTasks);
  };
  return (
    <div className="mt-main">
      {tasks &&
        tasks.map((task, idx) => {
          return (
            <div className="mt-content" key={task.id}>
              <h1 className="mt-index mt-tcenter" style={{ width: '30px' }}>
                {idx + 1}.
              </h1>
              <input
                {...register(`${idx}.name` as const)}
                className="mt-list mt-tleft"
                onBlur={e => {
                  if (e.target.value === task.name) return;
                  handleChange(idx, 'name', e.target.value);
                }}
                disabled={!edit}
              />
              <div className="mt-percentage-area">
                <input
                  {...register(`${idx}.percentage` as const)}
                  className="mt-tcenter mt-number"
                  style={{ width: '30px' }}
                  type="number"
                  onBlur={e => {
                    if (e.target.value === task.percentage?.toString()) return;
                    handleChange(idx, 'percentage', +e.target.value);
                  }}
                  disabled={!edit}
                />
                <h1 className="mt-text">%</h1>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default MembersTasks;
