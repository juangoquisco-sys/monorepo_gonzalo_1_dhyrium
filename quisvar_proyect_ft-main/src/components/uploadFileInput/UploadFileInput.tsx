import type { InputHTMLAttributes } from 'react';
import './uploadFileInput.css';

interface InputTextProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  subName: string;
  typeStyle?: number;
}

const getClassNames = (typeStyle: number) => {
  switch (typeStyle) {
    case 2:
      return {
        fileAreaClass: 'UploadFileInput-file-area-2',
        fileBtnClass: 'UploadFileInput-file-btn-2',
        fileTextClass: 'UploadFileInput-file-text-2',
      };
    default:
      return {
        fileAreaClass: 'UploadFileInput-file-area',
        fileBtnClass: 'UploadFileInput-file-btn',
        fileTextClass: 'UploadFileInput-file-text',
      };
  }
};

const UploadFileInput = ({
  name,
  subName,
  typeStyle = 1,
  ...props
}: InputTextProps) => {
  const { fileAreaClass, fileBtnClass, fileTextClass } =
    getClassNames(typeStyle);

  return (
    <div className={`UploadFileInput-file-area ${fileAreaClass}`}>
      <input type="file" className="UploadFileInput-file-input" {...props} />
      <div className="UploadFileInput-file-moreInfo">
        <div className={`UploadFileInput-file-btn ${fileBtnClass}`}>{name}</div>
        <p className={`UploadFileInput-file-text ${fileTextClass}`}>
          {subName}
        </p>
      </div>
    </div>
  );
};

export default UploadFileInput;
