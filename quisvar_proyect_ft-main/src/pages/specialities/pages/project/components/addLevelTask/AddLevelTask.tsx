// import React from 'react';

import { useEffect, useState, type MouseEvent } from 'react';
import Input from '@/components/Input/Input';
import './addLevelTask.css';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import type { SubTask } from '@/types/types';
import { TASK_TEMPLATE } from '../../../../models/definitionSpeciality';

interface DataForm {
  name: string;
}

interface AddLevelTaskProps {
  onChange?: (task: SubTask) => void;
}

const AddLevelTask = ({ onChange }: AddLevelTaskProps) => {
  const [addTask, setAddTask] = useState(false);
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<DataForm>();
  const handleAddTask = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    reset({ name: '' });
    setAddTask(!addTask);
  };

  useEffect(() => {
    const handleClick = () => setAddTask(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  const onSubmitData: SubmitHandler<DataForm> = async ({ name }) => {
    const task: SubTask = {
      ...TASK_TEMPLATE,
      name,
      price: '0',
    };
    onChange?.(task);
    reset({ name: '' });
  };
  return addTask ? (
    <form
      className="addLevelTask"
      onSubmit={handleSubmit(onSubmitData)}
      onClick={e => e.stopPropagation()}
    >
      <span className="levelSubtask-plus">+</span>
      <Input
        {...register('name', {
          validate: { validateWhiteSpace, validateCorrectTyping },
        })}
        autoFocus
        name="name"
        placeholder="Nombre de la tarea"
        className="projectAddLevel-input"
        errors={errors}
        errorPosX={350}
        errorPosY={-28}
      />
    </form>
  ) : (
    <div className="levelSubtask-add" onClick={handleAddTask}>
      <span className="levelSubtask-plus">+</span> Agregar tarea
    </div>
  );
};

export default AddLevelTask;
