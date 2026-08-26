import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import './divisionAddInput.css';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
interface FolderName {
  name: string;
}
interface DivisionAddInputProps {
  onSave: () => void;
  buttonText?: string;
  route: string;
  id?: number;
}
const DivisionAddInput = ({
  onSave,
  buttonText = 'Agregar',
  route,
  id,
}: DivisionAddInputProps) => {
  const [showInput, setShowInput] = useState<boolean>(false);
  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<FolderName>();
  const onSubmit: SubmitHandler<FolderName> = () => {
    if (id) {
      axiosInstance
        .patch(`/${route}/${id}`, { name: watch('name') })
        .then(() => {
          reset();
          onSave();
          setShowInput(false);
        });
    } else {
      axiosInstance.post(`/${route}`, { name: watch('name') }).then(() => {
        reset();
        onSave();
        setShowInput(false);
      });
    }
  };
  const showForm = () => {
    return (
      <form
        className="da-add-input"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
      >
        <Input
          placeholder="Nombre"
          className="da-header-add-btn"
          {...register('name', {
            validate: { validateWhiteSpace, validateCorrectTyping },
          })}
          name="name"
          required={true}
          errors={errors}
        />
        <div className="da-icon-area">
          <button
            type="submit"
            className="da-icon-action"
            onClick={handleSubmit(onSubmit)}
          >
            <img
              src="/svg/check-blue.svg"
              style={{ width: '20px', height: '20px' }}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInput(false);
              reset();
            }}
            className="da-icon-action"
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
  return showInput ? (
    showForm()
  ) : (
    <Button
      text={buttonText}
      icon="plus"
      variant="outline"
      position="center"
      onClick={() => setShowInput(true)}
    />
  );
};

export default DivisionAddInput;
