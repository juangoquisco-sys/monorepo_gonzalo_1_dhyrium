import useDebounceCallback from '@/hooks/useDebounceCallback';
import { axiosInstance, URL } from '@/services/axiosInstance';
import type { ItemsRes, KtaskFileRes } from '../../types/types.response';
import { PiUploadThin } from 'react-icons/pi';
import { FaFilePdf } from 'react-icons/fa6';
import { LiaTrashAlt } from 'react-icons/lia';
import { RxCrossCircled } from 'react-icons/rx';
import './fundsBody.css';
import { useEffect, useState } from 'react';
interface FundsBodyProps {
  item: ItemsRes;
  number: number;
  onSave?: () => void;
}
const FundsBody = ({ item, number, onSave }: FundsBodyProps) => {
  const [hasFile, setHasFile] = useState<KtaskFileRes[]>([]);
  const [showDelete, setShowDelete] = useState<boolean>(false);
  useEffect(() => {
    if (!item) return;
    setHasFile(item.files);
  }, [item]);

  const handleUpdate = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    key: keyof ItemsRes
  ) => {
    let value: string | number = e.target.value;
    if (key === 'price') value = parseFloat(e.target.value);
    if (item[key] !== value) {
      debounce({ [key]: value });
    }
  };
  const debounce = useDebounceCallback((itemUpdates: Partial<ItemsRes>) => {
    axiosInstance.put(`operationaltasks/item/${item.id}`, itemUpdates, {
      headers: { noLoader: true },
    });
  }, 1000);

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    const headers = {
      'Content-type': 'multipart/form-data',
      noLoader: true,
    };
    axiosInstance
      .post(`operationaltasks/files/${item.id}`, formData, {
        headers,
      })
      .then(() => onSave?.());
  };
  const handleDeleteFile = () => {
    axiosInstance
      .delete(`operationaltasks/files/${hasFile[0].id}`)
      .then(() => onSave?.());
  };
  const handleDeleteItem = () => {
    axiosInstance
      .delete(`operationaltasks/item/${item.id}`)
      .then(() => onSave?.());
  };
  return (
    <div className="fb-container">
      <div className="fb-text">{number + 1}</div>
      <textarea
        className="fb-textarea fb-text"
        style={{ textAlign: 'left', resize: 'none' }}
        defaultValue={item.description}
        onChange={e => handleUpdate(e, 'description')}
      />
      {/* <div className="fb-text">categoria1</div> */}
      <input
        type="number"
        className="fb-text"
        defaultValue={item.price}
        onChange={e => handleUpdate(e, 'price')}
      />
      {hasFile.length > 0 ? (
        <div
          className="fb-pdf-container"
          onMouseEnter={() => setShowDelete(true)}
          onMouseLeave={() => setShowDelete(false)}
        >
          <a
            href={`${URL}/public/ops/${hasFile[0].name}`}
            target="_blank"
            rel="noreferrer"
            className="fb-pdf fb-text"
          >
            Ver <FaFilePdf />
          </a>
          {showDelete && (
            <RxCrossCircled
              className="fb-pdf-delete"
              onClick={handleDeleteFile}
              size={15}
            />
          )}
        </div>
      ) : (
        <div className="fb-upload-container">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleAddFile}
            className="fb-upload-input"
          />
          <label htmlFor="fb-upload" className="fb-upload-label">
            <PiUploadThin />
            <span className="fb-upload-text">Subir PDF</span>
          </label>
        </div>
      )}
      <LiaTrashAlt
        className="fb-item-delete"
        onClick={handleDeleteItem}
        size={15}
      />
    </div>
  );
};

export default FundsBody;
