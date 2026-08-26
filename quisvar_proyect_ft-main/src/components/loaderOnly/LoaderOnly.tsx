import type { CSSProperties } from 'react';
import './loaderOny.css';
interface IconActionProps {
  className?: string;
  left?: number;
  right?: number;
  bottom?: number;
  top?: number;
  // position?: 'none' | 'auto';
  zIndex?: number;
  position?: CSSProperties['position'];
}
const LoaderOnly = ({
  className,
  bottom,
  left,
  position = 'relative',
  right,
  top,
  zIndex,
}: IconActionProps) => {
  const style: CSSProperties = {
    cursor: 'pointer',
    left: `${left}rem`,
    right: `${right}rem`,
    top: `${top}rem`,
    bottom: `${bottom}rem`,
    position,
    zIndex,
  };
  return <span className={`loaderOnly ${className}`} style={style}></span>;
};

export default LoaderOnly;
