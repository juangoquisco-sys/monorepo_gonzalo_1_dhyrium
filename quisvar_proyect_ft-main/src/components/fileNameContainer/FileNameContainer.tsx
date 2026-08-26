import type { MouseEvent } from 'react';
import './fileNameContainer.css';
interface FileNameContainerProps {
  fileName: string;
  onDelete: () => void;
  icon: string;
  Url?: string;
}
const FileNameContainer = ({
  fileName,
  onDelete,
  icon,
  Url,
}: FileNameContainerProps) => {
  const handleView = () => {
    if (!Url) return;
    const a = document.createElement('a');
    a.href = Url;
    a.target = '_blank';
    a.click();
  };

  const onDeleteFile = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onDelete();
  };
  return (
    <div className="FileNameContainer-file-name-container" onClick={handleView}>
      <p className="FileNameContainer-file-name-text">
        <img
          src={`/svg/${icon}.svg`}
          alt="W3Schools"
          className="FileNameContainer-file-name-icon"
        />
        {fileName}
      </p>
      <figure className="FileNameContainer-figure" onClick={onDeleteFile}>
        <img src="/svg/close.svg" alt="W3Schools" />
      </figure>
    </div>
  );
};

export default FileNameContainer;
