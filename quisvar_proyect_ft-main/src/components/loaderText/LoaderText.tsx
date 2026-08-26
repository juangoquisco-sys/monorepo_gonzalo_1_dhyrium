import type { CSSProperties } from 'react';
import './loaderText.css';
interface LoaderTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}
const LoaderText = ({ text, className, style }: LoaderTextProps) => {
  return (
    <div className={`loaderText ${className}`} style={style}>
      <span className="loader-text"></span>
      <p className="loaderText-text">{text}</p>
    </div>
  );
};

export default LoaderText;
