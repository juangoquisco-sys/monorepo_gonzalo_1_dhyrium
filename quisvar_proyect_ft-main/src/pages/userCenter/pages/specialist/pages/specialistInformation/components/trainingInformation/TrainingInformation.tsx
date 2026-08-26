import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { Training, TrainingName, TrainingSpecialty } from '@/types/types';
import Input from '@/components/Input/Input';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import TrainingTable from '../trainingTable/TrainingTable';

interface TrainingProps {
  training?: Training[];
  handleAddTraining: (e: boolean, v: number) => void;
  handleEditTraining: (
    e: boolean,
    trainingListId: number,
    recordId: number,
    d: TrainingSpecialty
  ) => void;
  onSave: () => void;
  showTitle?: boolean;
}
export const TrainingInformation = ({
  training,
  handleAddTraining,
  handleEditTraining,
  onSave,
  showTitle = true,
}: TrainingProps) => {
  const [trainingSelected, setTrainingSelected] = useState<number | null>(null);
  const [openAddTraining, setOpenAddTraining] = useState<boolean>(false);
  const { infoId } = useParams();
  const {
    handleSubmit,
    register,
    reset,
    // watch,
    formState: { errors },
  } = useForm<TrainingName>();
  useEffect(() => {
    return () => {
      setTrainingSelected(null);
    };
  }, [training]);
  const toggleDetailTraining = (trainingID: number) => {
    if (trainingSelected === trainingID) {
      setTrainingSelected(null);
    } else {
      setTrainingSelected(trainingID);
    }
  };
  const onSubmitData: SubmitHandler<TrainingName> = async body => {
    const data = {
      trainingName: body.trainingName,
      specialistId: Number(infoId),
    };
    axiosInstance.post('/trainingSpecialtyList', data).then(() => {
      setOpenAddTraining(false);
      reset({});
      onSave?.();
    });
  };
  const handleHideForm = () => {
    setOpenAddTraining(false);
    reset({});
  };
  const handleDelete = (id: number) => {
    axiosInstance.delete(`/trainingSpecialty/${id}`).then(() => onSave?.());
  };
  return (
    <>
      {showTitle && (
        <span className="specialist-info-title">Capacitaciones</span>
      )}
      <div className="specialist-more-info">
        {training &&
          training.map((train, idx) => (
            <div className="smi-container" key={train.trainingName}>
              <div
                className={`smi-items ${
                  trainingSelected !== idx ? 'smi-unselected' : 'smi-selected'
                }`}
                onClick={() => toggleDetailTraining(idx)}
              >
                <div className="smi-specialty-name">
                  <h3>Tipo de capacitacion: </h3>
                  <h4>{train.trainingName}</h4>
                </div>
                <div className="smi-specialty-name">
                  <h3>Cantidad: </h3>
                  <h4>
                    {train.trainingSpecialistName.length} {`certificado(s)`}
                  </h4>
                </div>
                <img src="/svg/down.svg" alt="" style={{ width: '20px' }} />
              </div>
              {trainingSelected === idx && (
                <TrainingTable
                  datos={train.trainingSpecialistName}
                  id={train.id}
                  handleFuntion={handleAddTraining}
                  handleEdit={handleEditTraining}
                  handleDelete={handleDelete}
                />
              )}
            </div>
          ))}

        <span className="smi-add-specialty">
          {!openAddTraining ? (
            <div
              onClick={() => setOpenAddTraining(true)}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <img src="/svg/plus.svg" alt="" style={{ width: '12px' }} />
              <h3>Añadir capacitación</h3>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmitData)}
              className="projectAddLevel-form"
            >
              <Input
                {...register('trainingName', {
                  validate: { validateWhiteSpace, validateCorrectTyping },
                })}
                name="trainingName"
                placeholder="Tipo de capacitación"
                className="specialist-add-experience-field"
                errors={errors}
              />
              <figure
                className="projectAddLevel-figure"
                onClick={handleSubmit(onSubmitData)}
              >
                <img src="/svg/icon_save.svg" alt="W3Schools" />
              </figure>
              <figure
                className="projectAddLevel-figure"
                onClick={handleHideForm}
              >
                <img src="/svg/icon_close.svg" alt="W3Schools" />
              </figure>
            </form>
          )}
        </span>
      </div>
    </>
  );
};

export default TrainingInformation;
