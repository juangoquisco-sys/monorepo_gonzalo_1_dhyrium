import type { CSSProperties, ReactNode } from 'react';
import './iconAction.css';

interface IconActionProps {
  onClick?: () => void;
  className?: string;
  classNameText?: string;
  left?: number;
  size?: number;
  right?: number;
  bottom?: number;
  top?: number;
  icon?: string;
  iconTwo?: string;
  position?: 'none' | 'auto';
  zIndex?: number;
  shadow?: boolean;
  text?: string;
  fontWeight?: string;
  colorText?: string;
  IconComponent?: ReactNode;
}
const IconAction = ({
  onClick,
  className,
  size = 1,
  bottom,
  left,
  right,
  top,
  icon,
  iconTwo,
  position,
  zIndex,
  shadow,
  text,
  classNameText,
  colorText,
  fontWeight,
  IconComponent,
}: IconActionProps) => {
  const style: CSSProperties = {
    cursor: 'pointer',
    maxWidth: `${size}rem`,
    maxHeight: `${size}rem`,
    minWidth: `${size}rem`,
    minHeight: `${size}rem`,
    left: `${left}rem`,
    right: `${right}rem`,
    top: `${top}rem`,
    bottom: `${bottom}rem`,
    zIndex,
  };
  const styleText: CSSProperties = {
    fontWeight,
    color: colorText,
  };
  const Icon = (
    <figure
      className={`icon-figure ${
        position !== 'none' && !text && 'iconAction'
      } ${className} ${iconTwo && 'iconAction-hover'}`}
      style={style}
      onClick={e => {
        if (text) return;
        e.stopPropagation();
        onClick?.();
      }}
    >
      {IconComponent || (
        <img
          src={`/svg/${icon}.svg`}
          alt={icon}
          className={`normal ${shadow && 'IconAction-shadown'}`}
        />
      )}
      {iconTwo && (
        <img src={`/svg/${iconTwo}.svg`} alt={iconTwo} className="hover" />
      )}
    </figure>
  );

  return text ? (
    <div
      className={`iconAction-container `}
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {IconComponent || Icon}
      <span className={`${classNameText}`} style={styleText}>
        {text}
      </span>
    </div>
  ) : (
    Icon
  );
};

export default IconAction;
