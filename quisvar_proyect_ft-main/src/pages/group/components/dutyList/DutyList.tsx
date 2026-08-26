import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { Duty, DutyMember } from '../../types/types.response';
import './dutyList.css';
import { useEffect, useState } from 'react';
// import { Input } from '../../../../components';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import Members from './members/Members';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import { axiosInstance } from '@/services/axiosInstance';
interface DutyListProps {
  data: Duty;
  onSave: () => void;
}
const DutyList = ({ data, onSave }: DutyListProps) => {
  const [editMembers, setEditMembers] = useState<DutyMember[]>([]);
  const [edit, setEdit] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    // setValue,
    reset,
    // watch,
    formState: { errors },
  } = useForm<Duty>();

  // console.log(data);

  useEffect(() => {
    if (data) {
      reset({
        ...data,
      });
    }
  }, [data]);
  // console.log(editMembers);

  const onSubmit: SubmitHandler<Duty> = values => {
    // console.log(data);
    const { titleMeeting, dutyGroup, dutyGroupDate, listId } = values;
    const toSend = {
      titleMeeting,
      dutyGroup,
      dutyGroupDate,
      listId,
      members: editMembers,
    };
    axiosInstance.patch(`duty/items/${data.id}`, toSend).then(() => onSave?.());
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="dl-container">
      <Input
        {...register('titleMeeting', { validate: validateWhiteSpace })}
        errors={errors}
        label="Asunto de la reunion:"
        disabled={!edit}
        classNameMain="dl-meeting"
        style={{
          textTransform: 'uppercase',
          border: 'none',
          color: '#001b69',
          fontWeight: '600',
          fontSize: '14px',
        }}
      />
      <div className="dl-theader">
        <h2 className="dl-htitle">ASISTENCIA</h2>
        <h2 className="dl-htitle">INFORMES</h2>
        <h2 className="dl-htitle">COMPROMISOS</h2>
        <h2 style={{ flexGrow: 0.5 }}></h2>
      </div>
      <div className="dl-header">
        <h2 className="dl-title">#</h2>
        <h2 className="dl-title">APELLIDOS Y NOMBRES</h2>
        <h2 className="dl-title">ASISTENCIA</h2>
        <h2 className="dl-title">TAREAS</h2>
        <h2 className="dl-title">COMENTARIOS</h2>
        <h2 className="dl-title">COMPROMISO DIARIO</h2>
        <h2 className="dl-title">COMPROMISO GRUPAL</h2>
      </div>
      <div className="dl-body">
        <Members
          members={data.members}
          dutyId={data.id}
          onSave={onSave}
          editMember={e => setEditMembers(e)}
          edit={edit}
        />
        <div className="dl-duty-content">
          <textarea
            {...register('dutyGroup')}
            disabled={!edit}
            className="dl-content-center"
            style={{
              minHeight: '50px',
              resize: 'none',
              overflow: 'hidden',
            }}
          />
          <input
            type="date"
            {...register('dutyGroupDate')}
            disabled={!edit}
            className="dl-content-center"
          />
        </div>
      </div>
      <div className="dl-btns">
        {!edit ? (
          <Button text="Editar" type="button" onClick={() => setEdit(true)} />
        ) : (
          <div className="dl-sumbit">
            <Button
              text="Cancelar"
              type="button"
              onClick={() => setEdit(false)}
              className="dl-cancel"
            />
            <Button text="Guardar" className="dl-save" type="submit" />
          </div>
        )}
      </div>
    </form>
  );
};

export default DutyList;
