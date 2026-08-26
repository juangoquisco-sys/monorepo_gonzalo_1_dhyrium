import MessageCell from './MessageCell';
import { CgFileDocument } from 'react-icons/cg';
import { COLOR_CSS } from '@/utils/cssData';

interface SubjectCellProps {
  value: {
    header: string;
    title: string;
    subtitle?: string;
  };
}

const SubjectCell = ({ value }: SubjectCellProps) => {
  return (
    <MessageCell
      icon={<CgFileDocument color={COLOR_CSS.primary} size={21} />}
      label={value.header}
      subLabel={value.title}
      subtitle={value.subtitle}
    />
  );
};

export default SubjectCell;
