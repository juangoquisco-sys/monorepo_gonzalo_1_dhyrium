import Input from '@/components/Input/Input';
import type { DataUser } from '@/types/types';
import './subtaskUsers.css';
import { useEffect, useState, type ChangeEvent, type FocusEvent } from 'react';

interface SubtaskUsersProps {
  usersData: DataUser[];
  handleRemoveUser?: (data: DataUser) => void;
  handlePorcentage?: (e: FocusEvent<HTMLInputElement>) => void;
  areAuthorizedUsers?: boolean;
  viewProcentage?: boolean;
}
const SubtaskUsers = ({
  usersData,
  handleRemoveUser,
  handlePorcentage,
  areAuthorizedUsers = false,
  viewProcentage = false,
}: SubtaskUsersProps) => {
  const [usersPercentage, setUsersPercentage] = useState<DataUser[] | null>(
    null
  );
  useEffect(() => {
    setUsersPercentage(usersData);
  }, [usersData]);

  const handleUserPercentage = (e: ChangeEvent<HTMLInputElement>) => {
    if (!usersPercentage) return;
    const { value, name: userId } = e.currentTarget;
    const newUserPorcentage = usersPercentage?.map(user =>
      user.id === +userId ? { ...user, percentage: +value } : user
    );
    setUsersPercentage(newUserPorcentage);
  };
  return (
    <div className="subtaskUsers-users-contain">
      <h4 className="subtaskUsers-title-information">
        <figure className="subtaskUsers-figure">
          <img src="/svg/user-task.svg" alt="W3Schools" />
        </figure>
        Lista de Usuarios Asignados:
      </h4>
      {usersPercentage?.map(_user => (
        <div key={_user.id} className="subtaskUsers-list-user">
          <h5 className="subtaskUsers-user-info">
            <figure className="subtaskUsers-figure">
              <img src="/svg/person-add.svg" alt="W3Schools" />
            </figure>
            {_user.name}
          </h5>
          {handleRemoveUser && (
            <button type="button" onClick={() => handleRemoveUser(_user)}>
              <img src="/svg/close.svg" className="subtaskUsers-user-delete" />
            </button>
          )}
          {handlePorcentage && (
            <div className="subtaskUsers-porcentage-input">
              {!_user.status ? (
                <Input
                  onBlur={handlePorcentage}
                  type="number"
                  placeholder={String(_user.percentage)}
                  value={String(_user.percentage)}
                  onChange={handleUserPercentage}
                  name={String(_user.id)}
                  className="subtaskUsers-percentage-value"
                  disabled={!areAuthorizedUsers}
                />
              ) : (
                _user.percentage + ' '
              )}
              %
            </div>
          )}
          {viewProcentage && (
            <div className="subtaskUsers-porcentage-input">
              <Input
                placeholder={String(_user.percentage)}
                name={String(_user.id)}
                className="subtaskUsers-percentage-value"
                disabled={true}
              />
              %
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SubtaskUsers;
