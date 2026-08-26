// import React from 'react'

import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { StageForm, StageInfo } from '@/types/types';
import CostTable from '@/components/costTable/CostTable';
import Input from '@/components/Input/Input';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { validateOnlyNumbers } from '@/utils/customValidatesForm';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import './GeneralData.css';
import { axiosInstance } from '@/services/axiosInstance';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { OfficeUnitTreeSelect } from '@/pages/group/components/OfficeUnitTreeSelect';
import { getMeetingUnitsOverview } from '@/pages/group/services/meetingUnitProjects.service';

type LegacyStageInfo = StageInfo & {
  assignmentUnit?: {
    id: string;
    name: string;
    type: string;
    codemap?: string | null;
  } | null;
};

type LegacyStageForm = Omit<StageForm, 'groupId'> & { unitId: string };

const GeneralData = () => {
  const { stageId } = useParams();
  const [stageInfo, setStageInfo] = useState<LegacyStageInfo | null>(null);
  const modAuth = useSelector((state: RootState) => state.modAuthProject);
  const {
    handleSubmit,
    register,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LegacyStageForm>();
  const unitsQuery = useQuery({
    queryKey: ['legacy-stage-assignment-units'],
    queryFn: getMeetingUnitsOverview,
  });

  useEffect(() => {
    getStageDetails();
  }, []);

  const getStageDetails = () => {
    axiosInstance
      .get<LegacyStageInfo>(`/stages/details/${stageId}`, {
        headers: { noLoader: true },
      })
      .then(res => {
        const {
          professionalCost,
          bachelorCost,
          graduateCost,
          internCost,
          budget,
        } = res.data;
        reset({
          bachelorCost,
          unitId: res.data.assignmentUnit?.id ?? '',
          professionalCost,
          graduateCost,
          internCost,
          budget,
        });
        setStageInfo(res.data);
      });
  };

  const dataInfoStage = () => {
    if (!stageInfo) return {};
    const { province, department, district, projectName, cui } =
      stageInfo.project.contract;
    return {
      ['Etapa:']: stageInfo.name,
      ['Proyecto:']: projectName,
      ['CUI:']: cui,
      ['Departamento:']: department,
      ['Provincia:']: province,
      ['Distrito:']: district,
    };
  };
  const onSubmitStage: SubmitHandler<LegacyStageForm> = async body => {
    axiosInstance
      .patch(`/stages/details/${stageId}`, body)
      .then(getStageDetails);
  };

  if (!stageInfo || unitsQuery.isLoading) return <LoaderForComponent />;

  return (
    <div className="generalData">
      <div className="generalData-main-info">
        <div className="generalData-info-stage">
          {Object.entries(dataInfoStage()).map(([key, value]) => (
            <div key={key} className="generalData-info-stage-content">
              <h4 className="generalData-info-stage-label">{key}</h4>
              <p className="generalData-info-stage-text">{value}</p>
            </div>
          ))}
        </div>
        {stageInfo.assignmentUnit && (
          <div className="generalData-info-group">
            <h2 className="generalData-edit-info-title">UNIDAD RESPONSABLE</h2>
            <p className="generalData-info-stage-text">
              {stageInfo.assignmentUnit.name}
            </p>
          </div>
        )}
      </div>
      {modAuth && (
        <form
          className="generalData-edit-info"
          onSubmit={handleSubmit(onSubmitStage)}
        >
          <h2 className="generalData-edit-info-title">
            PRE-AJUSTES DE LA ETAPA
          </h2>
          <div className="col-input">
            <label className="input-label">Unidad responsable:</label>
            <OfficeUnitTreeSelect
              units={unitsQuery.data?.data ?? []}
              value={watch('unitId') || undefined}
              onValueChange={unitId =>
                setValue('unitId', unitId, { shouldDirty: true })
              }
              placeholder="Asignar unidad"
              disabled={!modAuth}
            />
          </div>
          <div className="col-input">
            <Input
              label="Techo máximo asignado: "
              {...register('budget', {
                validate: { validateOnlyNumbers },
                valueAsNumber: true,
              })}
              name="budget"
              type="number"
              placeholder="0.00"
              errors={errors}
              disabled={!modAuth}
              isMoney
            />
            <div style={{ width: '100%' }} />
          </div>
          <div className="col-input">
            <Input
              label="Costo Practicante:"
              {...register('internCost', {
                validate: { validateOnlyNumbers },
                valueAsNumber: true,
              })}
              name="internCost"
              type="number"
              placeholder="Costo - Practicante"
              errors={errors}
              disabled={!modAuth}
            />
            <Input
              label="Costo Egresado:"
              {...register('graduateCost', {
                validate: { validateOnlyNumbers },
                valueAsNumber: true,
              })}
              name="graduateCost"
              type="number"
              placeholder="Costo - Egresado"
              errors={errors}
              disabled={!modAuth}
            />
          </div>
          <div className="col-input">
            <CostTable mount={+watch('internCost')} text="Practicante" />
            <CostTable mount={+watch('graduateCost')} text="Egresado" />
          </div>
          <div className="col-input">
            <Input
              label="Costo Bachiller:"
              {...register('bachelorCost', {
                validate: { validateOnlyNumbers },
                valueAsNumber: true,
              })}
              name="bachelorCost"
              type="number"
              placeholder="Costo - Bachiller "
              errors={errors}
              disabled={!modAuth}
            />
            <Input
              label="Costo Titulado:"
              {...register('professionalCost', {
                validate: { validateOnlyNumbers },
                valueAsNumber: true,
              })}
              type="number"
              name="professionalCost"
              placeholder="Costo - Titulado"
              errors={errors}
              disabled={!modAuth}
            />
          </div>
          <div className="col-input">
            <CostTable mount={+watch('bachelorCost')} text="Bachiller" />
            <CostTable mount={+watch('professionalCost')} text="Titulado" />
          </div>
          {modAuth && <Button type="submit" text={`Guardar`} />}
        </form>
      )}
    </div>
  );
};

export default GeneralData;
