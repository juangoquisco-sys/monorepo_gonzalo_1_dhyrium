import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { COLOR_CSS } from '@/utils/cssData';
import './salarySidebarItem.css';
import { PiCheckSquareOffsetBold } from 'react-icons/pi';
import { MdOutlineSave, MdOutlineClose } from 'react-icons/md';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { axiosInstance } from '@/services/axiosInstance';
import { useEffect } from 'react';
interface SalarySidebarItemCreatedProps {
  handleClose: () => void;
  onSave: () => void;
  initValue: number;
}

interface SalarySend {
  numberSalary: number;
}
const SalarySidebarItemCreated = ({
  handleClose,
  initValue,
  onSave,
}: SalarySidebarItemCreatedProps) => {
  const { handleSubmit, register, setFocus } = useForm<SalarySend>();
  useEffect(() => {
    setFocus('numberSalary');
  }, [setFocus]);

  const onSubmit: SubmitHandler<SalarySend> = async ({ numberSalary }) => {
    if (isNaN(numberSalary)) {
      return SnackbarUtilities.warning(
        'El numero de planilla debe estar en un formato correcto.'
      );
    }
    const body = {
      pad: numberSalary,
    };
    await axiosInstance.post('/payrolls', body);
    onSave();
  };
  return (
    <div className={`salarySidebarItem  salarySidebarItemCreated`}>
      <div className="salarySidebarItemCreated-title">
        <PiCheckSquareOffsetBold color={COLOR_CSS.secondary} size={21} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <h3 className="salarySidebarItem-name-created">
            PLANILLA N°{' '}
            <input
              type="number"
              className="salarySidebarItem-number-created"
              {...register('numberSalary', {
                valueAsNumber: true,
                value: initValue,
              })}
              name="numberSalary"
            />{' '}
            - 2024
          </h3>
        </form>
      </div>
      <div className="salarySidebarItem-icons">
        <MdOutlineSave
          color={COLOR_CSS.secondary}
          size={17}
          onClick={handleSubmit(onSubmit)}
          cursor={'pointer'}
        />
        <MdOutlineClose
          color={COLOR_CSS.dangerLight}
          size={19}
          onClick={handleClose}
          cursor={'pointer'}
        />
      </div>
    </div>
  );
};

export default SalarySidebarItemCreated;
