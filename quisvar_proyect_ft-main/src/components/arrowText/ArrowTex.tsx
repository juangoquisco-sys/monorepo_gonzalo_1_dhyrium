import type { CSSProperties } from 'react';
import './arrowText.css';
import { COLOR_CSS } from '@/utils/cssData';
import IconAction from '../iconAction/IconAction';
interface ArrowTexProps {
  onClickClose?: () => void;
  onClick?: () => void;
  text: string;
  isDisabled?: boolean;
  width?: number;
  height?: number;
  isPressed?: boolean;
}
const ArrowText = ({
  onClickClose,
  text,
  isDisabled = false,
  width = 160,
  height = 30,
  isPressed = false,
  onClick,
}: ArrowTexProps) => {
  const styleContainer: CSSProperties = {
    backgroundColor: isDisabled ? COLOR_CSS.gray : COLOR_CSS.primary,
    width: width - width * 0.05,
    height: height - height * 0.2,
  };
  return (
    <div className="arrowText-container">
      <div
        className={`arrowText-content ${isPressed ? 'arrowText-pressed' : ''}`}
        style={{
          width: width,
          height: height,
        }}
      >
        <div className="arrowText" style={styleContainer} onClick={onClick}>
          <p className="arrowText-label">{text}</p>
        </div>
      </div>
      {onClickClose && (
        <IconAction
          icon="close"
          position="none"
          onClick={onClickClose}
          right={1}
          top={-0.5}
        />
      )}
    </div>
  );
};

export default ArrowText;
