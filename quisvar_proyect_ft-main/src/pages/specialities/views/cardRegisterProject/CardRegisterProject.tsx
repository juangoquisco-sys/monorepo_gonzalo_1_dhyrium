import Button from '@/components/button/Button';
import IconAction from '@/components/iconAction/IconAction';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import TextArea from '@/components/textArea/TextArea';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenCardRegisteProject$ } from '@/services/sharingSubject';
import './CardRegisterProject.css';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { Contract, ProjectForm } from '@/types/types';
import { Subscription } from 'rxjs';
import {
  validateWhiteSpace,
  validateCorrectTyping,
} from '@/utils/customValidatesForm';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface CardRegisterProjectProps {
  onSave?: () => void;
}

const CardRegisterProject = ({ onSave }: CardRegisterProjectProps) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProjectForm>();

  const handleIsOpen = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleIsOpen.current = isOpenCardRegisteProject$.getSubject.subscribe(
      data => {
        const { idProject, isDuplicate } = data;
        setIsOpenModal(data.isOpen);
        if (idProject) {
          reset({
            id: idProject,
            isDuplicate,
          });
        } else {
          reset({
            typeSpecialityId: data.typeSpecialityId,
          });
        }
      }
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, [reset]);

  const onSubmit: SubmitHandler<ProjectForm> = values => {
    const { id, contractId, typeSpecialityId, name, isDuplicate } = values;
    const newBody = { contractId, typeSpecialityId, name };
    if (id) {
      if (isDuplicate) {
        axiosInstance
          .post(`/duplicates/project/${id}`, newBody)
          .then(successfulShipment);
      } else {
        axiosInstance.patch(`projects/${id}`, newBody).then(successfulShipment);
      }
    } else {
      axiosInstance.post('projects', newBody).then(successfulShipment);
    }
  };

  const successfulShipment = () => {
    onSave?.();
    setIsOpenModal(false);
    reset();
  };

  const closeFunctions = () => {
    reset({});
    setIsOpenModal(false);
  };

  const handleSearchCui = () => {
    const cui = watch('CUI');
    if (!cui) return SnackbarUtilities.warning('Campo vacio!!');
    axiosInstance.get(`contract?cui=${cui}`).then(res => {
      const [firstData] = res.data as Contract[];
      const {
        department,
        district,
        province,
        projectName,
        id,
        projectShortName,
      } = firstData;
      reset({
        ...watch(),
        typeSpecialityId: watch('typeSpecialityId'),
        department,
        district,
        province,
        contractId: id,
        description: projectName,
        name: projectShortName,
      });
    });
  };
  return (
    <Modal size={50} isOpenProp={isOpenModal}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-register"
        autoComplete="off"
      >
        <IconAction icon="close" onClick={closeFunctions} />

        <h2>
          {watch('isDuplicate') ? 'DUPLICAR PROYECTO' : 'REGISTRAR PROYECTO'}
        </h2>
        <hr />
        <div className="card-register-project-container-details">
          <div className="col-input-top">
            <div className="edit-this">
              <Input
                label="CUI:"
                {...register('CUI', {
                  validate: { validateWhiteSpace },
                })}
                name="CUI"
                placeholder="CUI"
                errors={errors}
                handleSearch={handleSearchCui}
              />
            </div>
            <Input
              label="Nombre Corto:"
              {...register('name', {
                validate: { validateWhiteSpace, validateCorrectTyping },
              })}
              name="name"
              type="text"
              disabled
              placeholder="Nombre Corto "
              errors={errors}
            />
          </div>
          <TextArea
            label="Nombre Completo del Proyecto:"
            {...register('description', {
              validate: { validateWhiteSpace },
            })}
            name="description"
            disabled
            placeholder="Nombre completo del Proyecto"
            errors={errors}
          />
          <div className="col-input">
            <Input
              label="Departamento:"
              {...register('department', {
                validate: { validateWhiteSpace },
              })}
              disabled
              name="department"
              errors={errors}
            />
            <Input
              label="Provincia:"
              {...register('province', {
                validate: { validateWhiteSpace },
              })}
              disabled
              name="province"
              errors={errors}
            />
            <Input
              label="Distrito:"
              {...register('district', {
                validate: { validateWhiteSpace },
              })}
              disabled
              name="district"
              errors={errors}
            />
          </div>
        </div>
        <Button
          type="submit"
          text={`${watch('id') ? 'Duplicar' : 'Registrar'}`}
          position="center"
        />
      </form>
    </Modal>
  );
};

export default CardRegisterProject;
