import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import './cardDivisionLeader.css';
import { Subscription } from 'rxjs';
import { isOpenCardDivisionLeader$ } from '@/services/sharingSubject';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import { useOfficeUsers } from '@/hooks/useUserLookupOptions';
import { MdPerson } from 'react-icons/md';
interface UserId {
  id: number;
}
interface Leaders {
  profile: {
    id: number;
    firstName: string;
    lastName: string;
  };
}
interface CardDivison {
  onSave: () => void;
}
const CardDivisionLeader = ({ onSave }: CardDivison) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [data, setData] = useState<Leaders[]>([]);
  const [hasId, setHasId] = useState<number>();
  const { handleSubmit } = useForm<UserId>();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: users = [] } = useOfficeUsers({ enabled: isOpen });
  const handleIsOpen = useRef<Subscription>(new Subscription());
  useEffect(() => {
    handleIsOpen.current = isOpenCardDivisionLeader$.getSubject.subscribe(
      value => {
        setIsOpen(value.isOpen);
        console.log(value.leaders);
        setHasId(value.id);
        setData(value.leaders);
      }
    );

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  const onSubmit: SubmitHandler<UserId> = () => {
    // axiosInstance
    //   .post(`groups/relation/${filterList[0].id}/${hasId}`)
    //   .then(() => {
    //     setIsOpen(false);
    //     setSearchTerm('');
    //     onSave();
    //   });
  };
  const filterList = useMemo(() => {
    if (searchTerm === '') return [];

    const filteredByStatus = users.filter(user => user.status === true);
    const normalizedSearch = searchTerm.toLowerCase();

    if (!searchTerm) return filteredByStatus;
    return filteredByStatus.filter(
      user =>
        user.dni.startsWith(searchTerm) ||
        user.name.toLowerCase().includes(normalizedSearch)
    );
  }, [searchTerm, users]);
  const closeFunctions = () => {
    setIsOpen(false);
    setSearchTerm('');
    setHasId(undefined);
  };
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const handleMakeLeader = (leaderId: number) => {
    axiosInstance.patch(`/division/leader/${hasId}/${leaderId}`).then(() => {
      closeFunctions();
      onSave();
    });
  };
  const handleDeleteLeader = (leaderId: number) => {
    axiosInstance.delete(`/division/leader/${hasId}/${leaderId}`).then(() => {
      closeFunctions();
      onSave();
    });
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1>Asignar jefe de oficina</h1>
        <div className="col-input">
          <Input
            type="text"
            placeholder="Buscar por DNI o nombre"
            value={searchTerm}
            onChange={handleSearchChange}
            label="Busqueda"
            disabled={data.length === 2}
          />
        </div>
        {filterList.length > 0 && (
          <div className="col-input cdl-space">
            <label className="cdl-user">
              <MdPerson />
              <h4 className="cdl-user-name">{filterList[0].name}</h4>
            </label>
            <Button
              text="Asignar"
              variant="outline"
              onClick={() =>
                handleMakeLeader(filterList[0].profileId ?? filterList[0].id)
              }
            />
          </div>
        )}
        {data.length > 0 && (
          <div className="col-input">
            <h1 className="cdl-leader-asigned">{`Jefes asignados (maximo 2)`}</h1>
          </div>
        )}
        {data.length > 0 && (
          <div className="col-input">
            {data.map((item, idx) => (
              <div className="col-input cdl-space" key={idx}>
                <label className="cdl-user">
                  <MdPerson />
                  <h4 className="cdl-user-name">
                    {item.profile.firstName + ' ' + item.profile.lastName}
                  </h4>
                </label>
                <Button
                  text="Quitar"
                  variant="outline"
                  borderColor="danger"
                  textColor="danger"
                  onClick={() => handleDeleteLeader(item.profile.id)}
                />
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CardDivisionLeader;
