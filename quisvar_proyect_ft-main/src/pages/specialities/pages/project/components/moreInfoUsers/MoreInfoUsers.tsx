import type { ParticipantSummary } from '@/types/types';
import './moreInfoUsers.css';
interface MoreInfoUsersProps {
  users: ParticipantSummary[];
}
export const MoreInfoUsers = ({ users }: MoreInfoUsersProps) => {
  return (
    <div className="moreInfoUsers-datails-contain moreInfoUsers-datails-absolute">
      {users.map(user => (
        <div className="moreInfoUsers-users-contain">
          <p className="moreInfoUsers-user-names">
            - {user.firstName} {user.lastName}
          </p>
          <span className="moreInfoUsers-count">x{user.count}</span>
        </div>
      ))}
      {users.length === 0 && (
        <span className="moreInfoUsers-info">Aun no hay usuarios Asignado</span>
      )}
    </div>
  );
};

export default MoreInfoUsers;
