import { IoIosArrowBack } from 'react-icons/io';
import './resizableIcon.css';
interface ResizableIconProps {
  handleHideElements: () => void;
  hideElements: boolean;
}
const ResizableIcon = ({
  handleHideElements,
  hideElements,
}: ResizableIconProps) => {
  return (
    <div className="resizableIcon">
      <button
        className="resizableIcon-button-icon"
        onClick={handleHideElements}
      >
        <IoIosArrowBack
          className={`resizableIcon-icon ${
            hideElements && 'resizableIcon-icon-invert'
          }`}
        />
      </button>
    </div>
  );
};

export default ResizableIcon;
