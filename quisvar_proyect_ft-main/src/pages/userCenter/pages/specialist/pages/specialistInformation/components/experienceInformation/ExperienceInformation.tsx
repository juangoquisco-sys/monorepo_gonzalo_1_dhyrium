import { useEffect, useState } from 'react';
import AdvancedSelectCrud from '@/components/select/AdvancedSelectCrud';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import type {
  AreaSpecialty,
  AreaSpecialtyName,
  Experience,
  Option,
} from '@/types/types';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import { useParams } from 'react-router-dom';
import {
  // validateCorrectTyping,
  // validateWhiteSpace,
  sumAllExperience,
} from '@/utils/experienceFunctions/experienceFunctions';
import ExperienceTable from '../experienceTable/ExperienceTable';
import CardEditSpecialties from '../../views/cardEditSpecialties/CardEditSpecialties';
import { isOpenCardOffice$ } from '@/services/sharingSubject';
// import { OfficeSelect } from '../../../../../procedure/models';
import type { SpecialtiesSelect } from '@/pages/userCenter/models/specialtyOption.types';
import './experienceInformation.css';

interface ExperienceProps {
  experiences?: Experience[];
  handleAddExperience: (e: boolean, v: number) => void;
  handleEditExperience: (e: boolean, v: number, d: AreaSpecialty) => void;
  onSave: () => void;
  showTitle?: boolean;
}
export const ExperienceInformation = ({
  experiences,
  handleAddExperience,
  handleEditExperience,
  onSave,
  showTitle = true,
}: ExperienceProps) => {
  const [experienceSelected, setExperienceSelected] = useState<number | null>(
    null
  );
  const [specialties, setProfessions] = useState<SpecialtiesSelect[] | null>(
    null
  );
  const [openAddSpeciality, setOpenAddSpeciality] = useState<boolean>(false);
  const { infoId } = useParams();
  const {
    handleSubmit,
    reset,
    control,
    // formState: { errors },
  } = useForm<AreaSpecialtyName>();
  useEffect(() => {
    return () => {
      setExperienceSelected(null);
    };
  }, [experiences]);

  const onSubmitData: SubmitHandler<AreaSpecialtyName> = async body => {
    const data = {
      specialistId: Number(infoId),
    };
    axiosInstance
      .post(`/areaSpecialtyList/${body.specialtyName.id}`, data)
      .then(() => {
        setOpenAddSpeciality(false);
        reset({});
        onSave?.();
      });
  };

  const toggleDetailExperience = (experienceID: number) => {
    if (experienceSelected === experienceID) {
      setExperienceSelected(null);
    } else {
      setExperienceSelected(experienceID);
    }
  };
  const handleHideForm = () => {
    setOpenAddSpeciality(false);
    reset({});
  };
  const handleCreateOffice = (label: string) => {
    const body = {
      name: label,
    };
    axiosInstance.post('/listSpecialties', body).then(() => {
      getSpecialties();
    });
  };
  const handleDelete = (id: number) => {
    axiosInstance.delete(`/areaSpecialty/${id}`).then(() => onSave?.());
  };

  useEffect(() => {
    getSpecialties();
  }, []);

  const getSpecialties = () => {
    axiosInstance
      .get(`/listSpecialties`)
      .then(res => {
        setProfessions(res.data);
      })
      .catch(error => {
        console.error('Error fetching professions:', error);
      });
  };
  const handleEditSS = ({ label, id }: SpecialtiesSelect) => {
    isOpenCardOffice$.setSubject = {
      isOpen: true,
      data: {
        id,
        name: label,
      },
    };
  };
  const handleDeleteSpecialty = (id: number) => {
    axiosInstance.delete(`/areaSpecialtyList/${id}`).then(() => onSave?.());
  };
  return (
    <>
      {showTitle && (
        <span className="specialist-info-title">Especialidades</span>
      )}
      <div className="specialist-more-info">
        {experiences &&
          experiences.map((experience, idx) => {
            const res = sumAllExperience(experience.areaSpecialtyName);
            const optionsData: Option[] = [
              {
                name: 'Eliminar',
                type: 'button',
                icon: 'trash-red',
                function: () => handleDeleteSpecialty(experience.id),
              },
            ];
            return (
              <div key={experience.id}>
                <AppContextMenu data={optionsData} className="smi-container">
                  <div
                    className={`smi-items ${
                      experienceSelected !== idx
                        ? 'smi-unselected'
                        : 'smi-selected'
                    }`}
                    onClick={() => toggleDetailExperience(idx)}
                  >
                    <div className="smi-specialty-name">
                      <h3>Especialidad: </h3>
                      <h4>{experience.listSpecialities.name}</h4>
                    </div>
                    <div className="smi-specialty-name">
                      <h3>Años de experiencia: </h3>
                      <h4>{`${res.totalYears} año(s) y ${res.totalMonths} mes(es)`}</h4>
                    </div>
                    <img src="/svg/down.svg" alt="" style={{ width: '20px' }} />
                  </div>
                  {experienceSelected === idx && (
                    <ExperienceTable
                      datos={experience.areaSpecialtyName}
                      id={experience.id}
                      handleFuntion={handleAddExperience}
                      handleEdit={handleEditExperience}
                      handleDelete={handleDelete}
                    />
                  )}
                </AppContextMenu>
              </div>
            );
          })}
        <span className="smi-add-specialty">
          {!openAddSpeciality ? (
            <div
              onClick={() => setOpenAddSpeciality(true)}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <img src="/svg/plus.svg" alt="" style={{ width: '12px' }} />
              <h3>Añadir especialidad</h3>
            </div>
          ) : (
            specialties && (
              <form onSubmit={handleSubmit(onSubmitData)} className="ei-select">
                <AdvancedSelectCrud
                  control={control}
                  options={specialties}
                  name="specialtyName"
                  onCreateOption={handleCreateOffice}
                  onEditOption={handleEditSS}
                  urlDelete={'/listSpecialties'}
                  onSave={getSpecialties}
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
            )
          )}
        </span>
      </div>
      <CardEditSpecialties onSave={getSpecialties} />
    </>
  );
};

export default ExperienceInformation;
