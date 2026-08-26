import type { User } from '@/types/types';
import { capitalizeText } from '@/utils/tools';
import './generalDataGroupRow.css';
interface GeneralDataGroupRowProps {
  user: User;
  isMod?: boolean;
  index: number;
}
const GeneralDataGroupRow = ({
  user,
  isMod = false,
  index,
}: GeneralDataGroupRowProps) => {
  return (
    <div className="generalData-infor-group-contain">
      <span className="generalData-infor-group-text generalData-table-text-alter">
        {index}
      </span>
      <span
        className={`generalData-infor-group-text generalData-table-text-alter ${
          isMod && 'generalDataGroupRowProps-color-admin'
        }`}
      >
        {user.profile.firstName} {user.profile.lastName}
      </span>
      <span className="generalData-infor-group-text generalData-table-text-alter">
        {capitalizeText(`${user?.role?.name}`)}
      </span>
      <span className="generalData-infor-group-text generalData-table-text-alter">
        {user.profile.job.label}
      </span>
      <span className="generalData-infor-group-text generalData-table-text-alter">
        {user.profile.degree}
      </span>
    </div>
  );
};

export default GeneralDataGroupRow;
