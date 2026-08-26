import type { CSSProperties } from 'react';
import './closeIcon.css';

interface CloseIconProps {
  onClick?: () => void;
  className?: string;
  left?: number;
  size?: number;
  right?: number;
  bottom?: number;
  top?: number;
  zIndex?: number;
}
const CloseIcon = ({
  onClick,
  className,
  size = 1,
  bottom,
  left,
  right,
  top,
  zIndex,
}: CloseIconProps) => {
  const style: CSSProperties = {
    width: `${size}rem`,
    aspectRatio: 1,
    left: `${left}rem`,
    right: `${right}rem`,
    top: `${top}rem`,
    bottom: `${bottom}rem`,
    zIndex,
  };
  return (
    <figure
      className={`closeIcon ${className}`}
      style={style}
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <img src="/svg/close.svg" alt="close" />
    </figure>
  );
};

export default CloseIcon;
