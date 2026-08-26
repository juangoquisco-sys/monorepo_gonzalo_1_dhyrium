import type { ContractIndexData } from '@/types/types';
import './dropdownLevelContract.css';
import colors from '@/utils/json/colorsContract.json';
import { URL, axiosInstance } from '@/services/axiosInstance';
import type { ChangeEvent } from 'react';
import UploadFileInput from '@/components/uploadFileInput/UploadFileInput';
import ListProfessionals from '../../views/listProfessionals/ListProfessionals';
import { PiFilePdfFill } from 'react-icons/pi';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
interface DropdownLevelContractProps {
  level: ContractIndexData;
  idContract: number;
  editFileContractIndex: (id: string, value: 'yes' | 'no') => void;
  handleReportPdf: () => void;
}

export const DropdownLevelContract = ({
  level,
  idContract,
  editFileContractIndex,
  handleReportPdf,
}: DropdownLevelContractProps) => {
  const firstLevel = level.nivel === 0;
  const style = {
    backgroundColor: colors[level.nivel],
  };

  const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formdata = new FormData();
        formdata.append('file', file);
        formdata.append('name', `${level.id} ${level.name}`);
        formdata.append(
          'idempotencyKey',
          `web-contract-${idContract}-${level.id}-${file.name}-${file.size}`
        );
        const source = await axiosInstance.post<{
          artifact: { id: string };
        }>('/document-composer/sources/pdf', formdata, {
          headers: { 'Content-type': 'multipart/form-data' },
        });
        await axiosInstance.post(
          `/contract-documents/contracts/${idContract}/nodes/${encodeURIComponent(
            level.id
          )}/attachments`,
          { artifactId: source.data.artifact.id }
        );
        editFileContractIndex(level.id, 'yes');
        SnackbarUtilities.success('Documento asociado correctamente');
      } catch {
        SnackbarUtilities.error(
          'No se pudo validar y asociar el documento PDF'
        );
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleViewFile = async (subLevel: ContractIndexData) => {
    try {
      const response = await axiosInstance.get<Blob>(
        `/contract-documents/contracts/${idContract}/nodes/${encodeURIComponent(
          subLevel.id
        )}/download`,
        { responseType: 'blob' }
      );
      const objectUrl = window.URL.createObjectURL(response.data);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      window.open(
        `${URL}/index/contracts/${idContract}/${subLevel.id} ${subLevel.name}.pdf`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const handleDeleteFile = async (subLevel: ContractIndexData) => {
    try {
      await axiosInstance.delete(
        `/contract-documents/contracts/${idContract}/nodes/${encodeURIComponent(
          subLevel.id
        )}/attachments/current`
      );
    } catch {
      await axiosInstance.delete(
        `/contract/${idContract}/files?filename=${subLevel.id} ${subLevel.name}.pdf`
      );
    }
    editFileContractIndex(subLevel.id, 'no');
  };

  const noHaveFile = (subLevel: ContractIndexData) =>
    (!subLevel.hasFile || subLevel.hasFile === 'no') && subLevel.id !== '2.3';
  return (
    <div
      className={`${!firstLevel && 'DropdownLevelContract-dropdown-content'}`}
    >
      <ul className={`${!firstLevel && 'DropdownLevelContract-dropdown-sub'}`}>
        {level.hasFile !== undefined ? (
          <>
            {level.id === '2.4' ? (
              <ListProfessionals idContract={idContract} />
            ) : (
              <div className="DropdownLevelContract-upload-file">
                {level.hasFile === 'no' && level.id !== '2.3' && (
                  <UploadFileInput
                    name="Cargar documento"
                    subName="O arrastre y suelte el archivo aquí"
                    accept="application/pdf"
                    onChange={handleUploadFile}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          level?.nextLevel?.map(subLevel => (
            <li key={subLevel.id}>
              <div
                className={`DropdownLevelContract-sub-list-item`}
                style={style}
              >
                <div className={`DropdownLevelContract-section `}>
                  <div className="DropdownLevelContract-section-names">
                    <img
                      src="/svg/down.svg"
                      className={`DropdownLevelContract-dropdown-arrow ${
                        !noHaveFile(subLevel) && 'DropdownLevelContract-hide'
                      }`}
                    />
                    {noHaveFile(subLevel) && (
                      <input
                        type="checkbox"
                        className="DropdownLevelContract-dropdown-check"
                        defaultChecked={false}
                      />
                    )}
                    <h4 className={`DropdownLevelContract-sub-list-name`}>
                      <span className="DropdownLevelContract-sub-list-span">
                        {subLevel.id}
                      </span>
                      {subLevel.name}
                    </h4>
                  </div>
                  {subLevel.id === '2.3' && (
                    <div className="DropdownLevelContract-file-container">
                      <a
                        className="DropdownLevelContract-file-container-anchor"
                        onClick={handleReportPdf}
                      >
                        {/* <figure className="DropdownLevelContract-figure">
                          <img src="/svg/pdf-red.svg" alt="W3Schools" />
                        </figure> */}
                        <PiFilePdfFill color="red" size={20} />
                        <span className="DropdownLevelContract-file-container-name">
                          Ver pdf
                        </span>
                      </a>
                    </div>
                  )}
                  {subLevel.hasFile === 'yes' && subLevel.id !== '2.3' && (
                    <div className="DropdownLevelContract-file-container">
                      <button
                        type="button"
                        onClick={() => void handleViewFile(subLevel)}
                        className="DropdownLevelContract-file-container-anchor"
                      >
                        <figure className="DropdownLevelContract-figure">
                          <img src="/svg/pdf-red.svg" alt="W3Schools" />
                        </figure>
                        <span className="DropdownLevelContract-file-container-name">
                          Ver pdf
                        </span>
                      </button>
                      <figure
                        className="DropdownLevelContract-figure DropdownLevelContract-figure-trash"
                        onClick={() => handleDeleteFile(subLevel)}
                      >
                        <img src="/svg/trash-gray.svg" alt="W3Schools" />
                      </figure>
                    </div>
                  )}
                </div>
              </div>

              <DropdownLevelContract
                level={subLevel}
                idContract={idContract}
                editFileContractIndex={editFileContractIndex}
                handleReportPdf={handleReportPdf}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default DropdownLevelContract;
