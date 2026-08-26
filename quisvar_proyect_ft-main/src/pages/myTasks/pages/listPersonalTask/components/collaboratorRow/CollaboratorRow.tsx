import InputPercentage from '@/components/Input/InputPercentage';
import './collaboratorRow.css';
import type { Collaborator } from '../../interface/listPersonalTask.types';
import { IoPersonCircle, IoTrash } from 'react-icons/io5';
import { COLOR_CSS } from '@/utils/cssData';
import { BsArrowReturnRight } from 'react-icons/bs';

interface CollaboratorRowProps {
  collaborator: Collaborator;
  deleteCollaborator?: (data: Collaborator) => void;
  changePercentage?: (id: number, percentage: number) => void;
  limitPercentage?: number;
}
const CollaboratorRow = ({
  collaborator,
  deleteCollaborator,
  changePercentage,
  limitPercentage = 100,
}: CollaboratorRowProps) => {
  // const [percentage, setPercentage] = useState(0);
  const handlePercentage = (percentage: number) => {
    changePercentage?.(collaborator.id, percentage);
  };
  const isSubCollaborator = !!deleteCollaborator && !!changePercentage;
  return (
    <div className="collaboratorRow">
      <div className="collaboratorRow-user">
        {isSubCollaborator && (
          <BsArrowReturnRight size={21} color={COLOR_CSS.gray} />
        )}
        <div
          className={`collaboratorRow-user-info ${
            !isSubCollaborator && 'collaboratorRow-user-principal'
          }`}
        >
          <IoPersonCircle
            size={isSubCollaborator ? 21 : 26}
            color={COLOR_CSS.primary}
          />
          <span>{collaborator.fullName}</span>
        </div>
        {isSubCollaborator && (
          <IoTrash
            size={21}
            color={COLOR_CSS.danger}
            onClick={() => deleteCollaborator(collaborator)}
            cursor={'pointer'}
          />
        )}
      </div>
      <InputPercentage
        value={collaborator.percentage}
        onChange={handlePercentage}
        width={4}
        disabled={!isSubCollaborator}
        limit={limitPercentage}
      />
    </div>
  );
};

export default CollaboratorRow;
