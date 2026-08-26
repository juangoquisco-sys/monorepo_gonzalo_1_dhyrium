import type { CSSProperties } from 'react';
import './loaderForComponent.css';
interface LoaderForComponentProps {
  width?: number;
  color?: string;
  variant?: 'normal' | 'transparent';
}
const LOGOS = {
  default: 'img/dhyrium_logo.svg',
  christmas: 'img/Christmas-dhyrium_2.png',
};

const LoaderForComponent = ({
  width = 100,
  color = '#001b69',
  variant = 'normal',
}: LoaderForComponentProps) => {
  const style: CSSProperties = {
    width,
    aspectRatio: 1,
    borderBottomColor: color,
  };

  const styleContainer: CSSProperties = {
    ...(variant === 'transparent' && {
      position: 'absolute',
      zIndex: 1,
      backdropFilter: 'blur(1px)',
    }),
  };
  return (
    <div className="LoaderForComponent-loading" style={styleContainer}>
      <figure className="LoaderForComponent-loader-v2" style={style}>
        <img src={LOGOS.default} alt="" />
      </figure>
      {/* <span className="LoaderForComponent-loader" style={style}></span> */}
    </div>
  );
};

export default LoaderForComponent;
