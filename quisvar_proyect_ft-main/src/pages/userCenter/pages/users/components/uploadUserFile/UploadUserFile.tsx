import ButtonDelete from '@/components/button/ButtonDelete';
import UploadFile from '@/components/uploadFile/UploadFile';
import { URL } from '@/services/axiosInstance';
import type { TypeFileUser } from '@/types/types';
import { normalizeFileName } from '@/utils/tools';
import './uploadUserFile.css';

interface UploadUserFileProps {
  fileName: string;
  onSave?: () => void;
  userId: number | undefined;
  typeFile: TypeFileUser;
}
const UploadUserFile = ({
  fileName,
  onSave,
  userId,
  typeFile,
}: UploadUserFileProps) => {
  const fileNameTransform = normalizeFileName(fileName);
  return (
    <div className="uploadUserFile">
      {!fileName ? (
        <UploadFile
          text="Subir Archivo"
          onSave={onSave}
          uploadName="fileUser"
          URL={`/files/uploadFileUser/${userId}?typeFile=${typeFile}`}
        />
      ) : (
        <div className="uploadUserFile-content">
          <a
            href={`${URL}/file-user/${typeFile}/${fileName}`}
            target="_blank"
            className="uploadUserFile-download"
          >
            <figure className="uploadUserFile-files-icon">
              <img src="/svg/pdf-icon.svg" alt="W3Schools" />
            </figure>
            <label className="uploadUserFile-name">{fileNameTransform}</label>
          </a>
          <ButtonDelete
            icon="close"
            onSave={onSave}
            url={`/files/removeFileUser/${userId}/${fileName}?typeFile=${typeFile}`}
            className="uploadUserFile-files-btn-delete"
            passwordRequired
            fileName={fileNameTransform}
          />
        </div>
      )}
    </div>
  );
};

export default UploadUserFile;
