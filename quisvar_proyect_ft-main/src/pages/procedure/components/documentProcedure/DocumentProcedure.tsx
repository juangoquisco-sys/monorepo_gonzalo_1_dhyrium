import { useState } from 'react';
import InputFile from '@/components/inputFile/InputFile';
import './documentProcedure.css';
import { addFilesList, deleteFileOnList } from '@/utils/files/files.utils';
import ChipFileMessage from '../../pages/paymentProcessing/components/chipFileMessage/ChipFileMessage';

interface DocumentProcedureProp {
  getFilesList: (files: File[]) => void;
}

const DocumentProcedure = ({ getFilesList }: DocumentProcedureProp) => {
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const addFiles = (newFiles: File[]) => {
    const _files = addFilesList(fileUploadFiles, newFiles);
    getFilesList(_files);
    setFileUploadFiles(_files);
  };

  const deleteFiles = (delFiles: File) => {
    const _files = deleteFileOnList(fileUploadFiles, delFiles);
    if (_files) {
      setFileUploadFiles(_files);
      getFilesList(_files);
    }
  };

  return (
    <div className="documentProcedure-file-add">
      <h4 className="documentProcedure-add-document">Agregar Documentos:</h4>
      <InputFile
        className="documentProcedure-file-area"
        getFilesList={files => addFiles(files)}
      />
      {fileUploadFiles && (
        <div className="documentProcedure-container-file-grid">
          {fileUploadFiles.map((file, i) => (
            <ChipFileMessage
              className="documentProcedure-files-list"
              text={file.name}
              key={i}
              onClose={() => deleteFiles(file)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentProcedure;
