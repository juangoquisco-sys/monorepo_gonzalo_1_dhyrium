import type { CSSProperties, ReactNode } from 'react';

interface DivFlexPros {
  children: ReactNode;
  flexDirection?: CSSProperties['flexDirection'];
  gap?: number;
  alignItems?: CSSProperties['alignItems'];
  justifyContent?: CSSProperties['justifyContent'];
  overflow?: CSSProperties['overflow'];
  style?: CSSProperties;
  className?: string;
  width?: number;
  autoWidth?: boolean;
  pv?: number;
}
const DivFlex = ({
  children,
  flexDirection = 'row',
  gap = 1,
  alignItems = 'center',
  justifyContent = 'center',
  style,
  className,
  width,
  autoWidth = false,
  overflow,
  pv = 0,
}: DivFlexPros) => {
  const styleDiv: CSSProperties = {
    display: 'flex',
    gap: `${gap}rem`,
    flexDirection,
    justifyContent,
    alignItems,
    padding: `${pv}rem 0`,
    ...(overflow && { overflow }),
    ...(!autoWidth && { width: width ? `${width}rem` : '100%' }),
    ...style,
  };
  return (
    <div style={styleDiv} className={className}>
      {children}
    </div>
  );
};

export default DivFlex;
