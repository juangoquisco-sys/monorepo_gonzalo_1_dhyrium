import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import Input from '@/components/Input/Input';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
interface StageName {
  name: string;
}
interface StageAddProps {
  stageId: string | undefined;
  getStages: () => void;
  setBtnActive: (e: boolean) => void;
}
const StageAddButton = ({
  getStages,
  stageId,
  setBtnActive,
}: StageAddProps) => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<StageName>();
  const onSubmit: SubmitHandler<StageName> = values => {
    const data = {
      name: values.name,
      projectId: Number(stageId),
    };
    axiosInstance.post(`/stages`, data).then(() => {
      setBtnActive(false);
      reset();
      getStages();
    });
  };
  return (
    <form
      className="stage-add-input"
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
    >
      <Input
        placeholder="Nombre"
        className="stage-header-add-btn stage-add-btn-limit"
        {...register('name', {
          validate: { validateWhiteSpace, validateCorrectTyping },
        })}
        name="name"
        required={true}
        errors={errors}
      />
      <div className="stage-icon-area">
        <button type="submit" className="stage-icon-action">
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
          className="stage-icon-action"
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

export default StageAddButton;
