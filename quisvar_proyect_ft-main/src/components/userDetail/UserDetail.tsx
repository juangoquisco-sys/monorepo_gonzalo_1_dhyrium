import type { User } from '@/types/types';
import { getIconDefault } from '@/utils/tools';
import Button from '../button/Button';
import ButtonDelete from '../button/ButtonDelete';
import './UserDetail.css';
interface UserDetailProps {
  user: User;
  index: number;
  onClick?: () => void;
}
const UserDetail = ({ user, index, onClick }: UserDetailProps) => {
  return (
    <tr>
      <h1>asdsad</h1>
      <td className="userDetail-td">{index + 1}</td>
      <td className="userDetail-td user-info">
        <figure className="user-profile-figure">
          <img src={getIconDefault(user.profile.dni)} alt={user.email} />
        </figure>
        <div className="name-container">
          <h1 className="list-name">
            {user.profile?.firstName + ' ' + user.profile?.lastName}
          </h1>
          <span>{user.email}</span>
        </div>
      </td>
      <td className="userDetail-td">{user.role?.name}</td>
      <td
        className={`userDetail-td list-status ${
          user.status ? 'user-active' : 'user-inactive'
        }`}
      >
        {user.status ? 'Activo' : 'Inactivo'}
      </td>
      <td className="userDetail-td">{user.profile?.dni}</td>
      <td className="userDetail-td">{user.profile?.phone}</td>
      <td className="userDetail-td">
        <div className="edit-btn">
          <Button
            icon="pencil"
            className="project-edit-icon"
            onClick={onClick}
            variant="ghost"
          />
          <ButtonDelete
            icon="trash"
            url={`/users/${user.id}`}
            className="project-delete-icon"
          />
        </div>
      </td>
    </tr>
  );
};

export default UserDetail;
