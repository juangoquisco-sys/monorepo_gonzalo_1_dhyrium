import MessageCell from './MessageCell';
import { FaRegUser } from 'react-icons/fa';
import { COLOR_CSS } from '@/utils/cssData';
import type { UserProfile } from '@/types/types';
import { getFullName } from '@/utils/tools';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import type { CSSProperties } from 'react';

interface SubmitterCellProps {
  value: {
    user?: UserProfile;
    createdAt: Date;
  };
  style?: CSSProperties;
}
const SubmitterCell = ({ value, style }: SubmitterCellProps) => {
  return (
    <MessageCell
      style={style}
      icon={<FaRegUser color={COLOR_CSS.primary} size={19} />}
      label={getFullName(value.user)}
      subLabel={`Iniciado el ${formatDayDateTimeUtc(value.createdAt)} por`}
    />
  );
};

export default SubmitterCell;
