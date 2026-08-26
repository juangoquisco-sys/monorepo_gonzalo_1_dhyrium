import { useEffect, useRef, useState } from 'react';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Modal from '@/components/portal/Modal';
import TextArea from '@/components/textArea/TextArea';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { Subscription } from 'rxjs';
import { isOpenCardObservations$ } from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store.types';
import { getContractThunks } from '@/store/slices/contract.slice';

const CardObservations = () => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<{ observations: string }>();
  const contract = useSelector((state: RootState) => state.contract);
  const dispatch: AppDispatch = useDispatch();

  const handleIsOpen = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleIsOpen.current = isOpenCardObservations$.getSubject.subscribe(
      data => {
        const { isOpen, observations } = data;
        setIsOpenModal(isOpen);

        reset({
          observations,
        });
      }
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, [reset]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const onSubmit: SubmitHandler<{ observations: string }> = ({
    observations,
  }) => {
    if (!contract) return;
    axiosInstance
      .put(`/contract/${contract.id}/observations`, { observations })
      .then(() => {
        dispatch(getContractThunks(String(contract.id)));
        closeFunctions();
      });
  };
  const closeFunctions = () => {
    reset({});
    setIsOpenModal(false);
  };
  return (
    <Modal size={50} isOpenProp={isOpenModal}>
      <CloseIcon onClick={closeFunctions} />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-register"
        autoComplete="off"
      >
        <h2>Observaciones</h2>
        <hr />
        <div className="card-register-project-container-details">
          <TextArea
            {...register('observations', {
              validate: { validateWhiteSpace },
            })}
            rows={15}
            name="observations"
            className="input-main-style-2_1"
            placeholder="Observaciones"
            errors={errors}
            styleInput={3}
          />
        </div>

        <Button type="submit" text={`Guardar`} />
      </form>
    </Modal>
  );
};

export default CardObservations;
