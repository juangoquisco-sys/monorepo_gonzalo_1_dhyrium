import './messageCell.css';
import FloatingText from '@/components/floatingText/FloatingText';
import type { CSSProperties, ReactNode } from 'react';
interface MessageCellProps {
  subLabel: string;
  subtitle?: string;
  label: string;
  icon: ReactNode;
  style?: CSSProperties;
}
const MessageCell = ({
  label,
  subLabel,
  subtitle,
  icon,
  style,
}: MessageCellProps) => {
  return (
    <div className="MessageCell-container" style={style}>
      {icon}
      <div className="MessageCell-subject-container">
        <span className="MessageCell-subject-document"> {subLabel} </span>
        <FloatingText
          text={label}
          className="MessageCell-subject-subject text-ellipsis"
        >
          {label} {subtitle && <b>{subtitle}</b>}
        </FloatingText>
      </div>
    </div>
  );
};

export default MessageCell;
