import type { CSSProperties, ReactNode } from 'react';
import { COLOR_CSS } from '@/utils/cssData';
import type { ColorKeys } from '@/utils/cssData';
import './taskSelectViewTotal.css';
import { formatAmountMoneyPEN } from '@/utils/tools';
interface TasksSelectViewTotalProps {
  label: string;
  cost?: number;
  colorLabel?: ColorKeys;
  colorCost?: ColorKeys;
  fontWeightLabel?: CSSProperties['fontWeight'];
  fontWeightCost?: CSSProperties['fontWeight'];
  children?: ReactNode;
  width?: number;
  onClick?: () => void;
  onHover?: boolean;
  className?: string;
}
const TaskSelectViewTotal = ({
  cost,
  label,
  colorLabel = 'grayTertiary',
  colorCost = 'secondary',
  fontWeightCost = 600,
  fontWeightLabel = 300,
  children,
  width,
  onClick,
  onHover,
  className = '',
}: TasksSelectViewTotalProps) => {
  const labelStyle: CSSProperties = {
    color: COLOR_CSS[colorLabel],
    fontWeight: fontWeightLabel,
  };
  const costStyle: CSSProperties = {
    color: COLOR_CSS[colorCost],
    fontWeight: fontWeightCost,
  };
  return (
    <div
      className={`tasksSelectView-total ${className}`}
      style={{ width: width ? `${width}rem` : '100%' }}
    >
      <span
        className={`${
          onHover && 'tasksSelectView-total-label-hover'
        } tasksSelectView-total-label  `}
        style={labelStyle}
        onClick={onClick}
      >
        {label}
      </span>
      {children ? (
        children
      ) : (
        <span className="tasksSelectView-total-cost" style={costStyle}>
          {/* S/. {cost} */} {formatAmountMoneyPEN(cost ?? 0)}
        </span>
      )}
    </div>
  );
};
export default TaskSelectViewTotal;
