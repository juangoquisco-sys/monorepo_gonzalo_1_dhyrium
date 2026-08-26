import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import Input from '@/components/Input/Input';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import type { Group } from '@/types/types';
import './groupBtnAdd.css';
import { useEffect } from 'react';

interface StageName {
  name: string;
}
interface GroupBtnAddProps {
  onSave: () => void;
  setBtnActive: (e: boolean) => void;
  groupName?: string;
  groupLength?: number;
  id?: number;
}
const GroupBtnAdd = ({
  onSave,
  setBtnActive,
  groupName,
  groupLength,
  id,
}: GroupBtnAddProps) => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<Group>();
  useEffect(() => {
    if (groupName) {
      reset({ name: groupName });
    }
  }, [groupName, reset]);

  const onSubmit: SubmitHandler<StageName> = values => {
    const data = {
      name: values.name,
      gNumber: (groupLength || 0) + 1,
    };
    if (groupName) {
      axiosInstance.patch(`/groups/${id}`, data).then(() => {
        setBtnActive(false);
        reset();
        onSave();
      });
    } else {
      axiosInstance.post(`/groups`, data).then(() => {
        setBtnActive(false);
        reset();
        onSave();
      });
    }
  };
  return (
    <form
      className="gr-add-input"
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
    >
      <Input
        placeholder="Nombre"
        className="gr-header-add-btn gr-add-btn-limit"
        {...register('name', {
          validate: { validateWhiteSpace, validateCorrectTyping },
        })}
        name="name"
        required={true}
        errors={errors}
      />
      <div className="gr-icon-area">
        <button type="submit" className="gr-icon-action">
          <img
            src="/svg/check-blue.svg"
            style={{ width: '20px', height: '20px' }}
          />
        </button>
        <button
          onClick={() => {
            setBtnActive(false);
            reset();
          }}
          className="gr-icon-action"
        >
          <img
            src="/svg/cross-red.svg"
            style={{ width: '20px', height: '20px' }}
          />
        </button>
      </div>
    </form>
  );
};

export default GroupBtnAdd;
