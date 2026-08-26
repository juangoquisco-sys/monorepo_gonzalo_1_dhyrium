import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import './cardAddGroup.css';
import { isOpenCardAddGroup$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';
import Modal from '@/components/portal/Modal';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import { axiosInstance } from '@/services/axiosInstance';
import { useGroupUsers } from '@/hooks/useUserLookupOptions';

interface UserId {
  id: number;
}
interface CardAddGroupProps {
  onSave: () => void;
}
const CardAddGroup = ({ onSave }: CardAddGroupProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasId, setHasId] = useState<number>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const [searchTerm, setSearchTerm] = useState('');
  const { data: users = [] } = useGroupUsers({ enabled: isOpen });

  const { handleSubmit } = useForm<UserId>();

  useEffect(() => {
    handleIsOpen.current = isOpenCardAddGroup$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setHasId(value.id);
    });

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const onSubmit: SubmitHandler<UserId> = () => {
    axiosInstance
      .post(`groups/relation/${filterList[0].id}/${hasId}`)
      .then(() => {
        setIsOpen(false);
        setSearchTerm('');
        onSave();
      });
  };

  const closeFunctions = () => {
    setIsOpen(false);
    setSearchTerm('');
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
  const selectedUser = filterList[0];
  const selectedUserName = useMemo(() => {
    if (!selectedUser) return { firstName: '', lastName: '' };
    const [firstName = '', ...lastName] = selectedUser.name.split(' ');

    return { firstName, lastName: lastName.join(' ') };
  }, [selectedUser]);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1>Asignar Integrante</h1>
        <div className="col-input">
          <Input
            type="text"
            placeholder="Buscar por DNI o nombre"
            value={searchTerm}
            onChange={handleSearchChange}
            label="Busqueda"
          />
          <Input
            type="text"
            value={selectedUser?.userPc ?? ''}
            placeholder="Usuario"
            disabled
          />
        </div>
        <div className="col-input">
          <Input
            type="text"
            value={selectedUserName.firstName}
            placeholder="Nombre"
            disabled
          />
          <Input
            type="text"
            value={selectedUserName.lastName}
            placeholder="Apellido"
            disabled
          />
        </div>
        <div className="btn-build">
          <Button
            text={hasId ? 'GUARDAR' : 'ASIGNAR'}
            className="btn-area"
            whileTap={{ scale: 0.9 }}
            type="submit"
          />
        </div>
      </form>
    </Modal>
  );
};

export default CardAddGroup;
