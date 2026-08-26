import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import { Subscription } from 'rxjs';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import './cardAssing.css';
import type { Equipment } from '@/types/types';
import { isOpenCardAssing$ } from '@/services/sharingSubject';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import type { EquipmentCandidateUser } from '../../userCenter.service';
import { UserCenterService } from '../../userCenter.service';

interface CardAssingProps {
  onSave: () => void;
  onClose?: () => void;
}
interface EquipmentForm {
  name: string;
  description: string;
  doc?: string;
  firstName: string;
  lastName: string;
  userPc: string;
  dni: string;
}
const CardAssign = ({ onSave }: CardAssingProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasId, setHasId] = useState<number>(0);
  const [data, setData] = useState<Equipment>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<EquipmentCandidateUser[]>([]);
  const {
    register,
    handleSubmit,
    //setValue,
    reset,
    // watch,
    formState: { errors },
  } = useForm<EquipmentForm>();

  const loadCandidateUsers = useCallback(async () => {
    const candidateUsers = await UserCenterService.getEquipmentCandidates();
    setUsers(candidateUsers);
  }, []);

  useEffect(() => {
    handleIsOpen.current = isOpenCardAssing$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setHasId(value.id);
      setData(value.data);
      if (value.isOpen) void loadCandidateUsers();
      if (value.data) {
        setSearchTerm(value.data.user?.profile.dni as string);
        reset({
          name: value.data?.name,
          description: value.data?.description,
          dni: value.data?.user?.profile.dni,
          userPc: value.data?.user?.profile.userPc,
          firstName: value.data?.user?.profile.firstName,
          lastName: value.data?.user?.profile.lastName,
        });
      }
    });

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, [loadCandidateUsers, reset]);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filterList = useMemo(() => {
    if (searchTerm === '') return [];

    const filteredByStatus = users.filter(user => user.status === true);

    if (!searchTerm) return filteredByStatus;

    return filteredByStatus.filter(user =>
      user.profile.dni.startsWith(searchTerm)
    );
  }, [searchTerm, users]);
  // console.log(filterList[0]);

  const onSubmit: SubmitHandler<EquipmentForm> = async values => {
    if (!data) {
      const file = values.doc?.[0];
      const formData = new FormData();
      formData.append('file', file as string);
      formData.append('name', values.name);
      formData.append('userId', filterList[0].id.toString());
      formData.append('workStationId', hasId.toString());
      formData.append('description', values.description);
      const headers = {
        'Content-type': 'multipart/form-values',
      };
      axiosInstance
        .post(`/equipment`, formData, { headers })
        .then(successfulShipment);
    } else {
      // const file = values.doc?.[0];
      const newData = {
        name: values.name,
        workStationId: data.workStationId,
        userId: filterList[0].id,
        description: values.description,
      };
      axiosInstance
        .patch(`/equipment/${hasId}`, newData)
        .then(successfulShipment);
    }
  };
  const successfulShipment = () => {
    onSave?.();
    setIsOpen(false);
    reset();
  };
  const closeFunctions = () => {
    setIsOpen(false);
    setSearchTerm('');
    // onClose?.();
    // setErrorPassword({});
    reset({});
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1>Asignar Ordenador</h1>
        <div className="col-input">
          {data ? (
            <Input
              {...register('dni', {
                validate: { validateWhiteSpace },
              })}
              type="text"
              label="DNI"
              disabled
            />
          ) : (
            <Input
              type="text"
              placeholder="Buscar por DNI"
              value={searchTerm}
              onChange={handleSearchChange}
              label="Busqueda"
            />
          )}
          {data ? (
            <Input
              type="text"
              {...register('userPc', {
                validate: { validateWhiteSpace },
              })}
              disabled
            />
          ) : (
            <Input
              type="text"
              value={filterList.length > 0 ? filterList[0].profile.userPc : ''}
              placeholder="Usuario"
              disabled
            />
          )}
        </div>
        {data ? (
          <div className="col-input">
            <Input
              type="text"
              {...register('firstName', {
                validate: { validateWhiteSpace },
              })}
              disabled
            />
            <Input
              type="text"
              {...register('lastName', {
                validate: { validateWhiteSpace },
              })}
              disabled
            />
          </div>
        ) : (
          <div className="col-input">
            <Input
              type="text"
              value={
                filterList.length > 0 ? filterList[0].profile.firstName : ''
              }
              placeholder="Nombre"
              disabled
            />
            <Input
              type="text"
              value={
                filterList.length > 0 ? filterList[0].profile.lastName : ''
              }
              placeholder="Apellido"
              disabled
            />
          </div>
        )}

        <div className="col-input">
          <Input
            {...register('description', {
              validate: { validateWhiteSpace },
            })}
            label="Descripcion"
            errors={errors}
          />
        </div>
        <div className="col-input">
          <Input
            {...register('doc')}
            placeholder=""
            errors={errors}
            label="Documento"
            type="file"
            required
          />
        </div>
        <div className="btn-build">
          <Button
            text={data ? 'GUARDAR' : 'CREAR'}
            className="btn-area"
            whileTap={{ scale: 0.9 }}
            type="submit"
          />
        </div>
      </form>
    </Modal>
  );
};

export default CardAssign;
