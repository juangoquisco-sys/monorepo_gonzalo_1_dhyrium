import type { ChangeEvent } from 'react';
import './uploadFile.css';
import { axiosInstance } from '@/services/axiosInstance';

interface UploadFileProps {
  className?: string;
  URL: string;
  text: string;
  uploadName: string;
  onSave?: () => void;
}

const UploadFile = ({
  URL,
  uploadName,
  className,
  text,
  onSave,
}: UploadFileProps) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files as unknown as File[];
    if (!files) return;
    const formdata = new FormData();
    for (const file of files) {
      formdata.append(uploadName, file);
    }
    axiosInstance.post(URL, formdata).then(() => onSave?.());
  };
  return (
    <div className={`uploadFile ${className}`}>
      <p className="uploadFile-text">{text}</p>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="uploadFile-input"
      />
    </div>
  );
};

export default UploadFile;
