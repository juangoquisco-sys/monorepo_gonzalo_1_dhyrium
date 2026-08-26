import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import './cardResizing.css';
import { getCroppedImg } from './canvaResizing';
import Button from '../button/Button';
import Input from '../Input/Input';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface CardResizingProps {
  onSave?: () => void;
}

const CardResizing = ({ onSave }: CardResizingProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  // const [croppedImage, setCroppedImage] = useState<string | null>(null);

  const onFileChange = async ({ target }: ChangeEvent<HTMLInputElement>) => {
    const { files } = target;
    if (files && files.length) {
      const file = files[0];
      const fileName = file.name.split('.')[0];
      if (!['image/svg+xml', 'image/png'].includes(file.type)) {
        SnackbarUtilities.warning('Archivo con extensión no permitida');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        SnackbarUtilities.warning('Archivo con 10mb de limite de tamaño');
        return;
      }
      const imageDataUrl = await readChooseFile(file);
      setImageSrc(imageDataUrl);
      setImageName(fileName + '.png');
    }
  };

  const handleRemoveImageSrc = () => {
    setImageSrc(null);
    setImageName(null);
    setCroppedAreaPixels(null);
    onSave?.();
    setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const readChooseFile = async (file: File) => {
    const reader = new FileReader();
    const urlFile: Promise<string | null> = new Promise(resolve => {
      reader.addEventListener(
        'load',
        () => resolve(reader.result as string),
        false
      );
      reader.readAsDataURL(file);
    });
    return urlFile;
  };

  const convertUrlToBlob = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob;
  };

  const showCroppedImage = async () => {
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    const formData = new FormData();
    if (imageSrc && imageName && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImage) return;
      const image = await convertUrlToBlob(croppedImage);
      formData.append('file', image, imageName);
      axiosInstance.post('encrypt', formData, { headers }).then(({ data }) => {
        SnackbarUtilities.success(data.message);
        handleRemoveImageSrc();
      });
    }
  };

  const downloadCroppedImage = async () => {
    const ref = document.createElement('a');
    if (imageSrc && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImage) return;
      ref.href = croppedImage;
      ref.download = 'firma_recortada';
      ref.click();
    }
  };

  // const convertBlobToBase64 = async (blobUrl: string) => {
  //   const response = await fetch(blobUrl);
  //   const blob = await response.blob();
  //   const result: Promise<string> = new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       const base64String = reader.result as string;
  //       resolve(base64String);
  //     };
  //     reader.onerror = reject;
  //     reader.readAsDataURL(blob);
  //   });
  //   return result;
  // };

  return (
    <div className="card-resizing-container">
      <>
        {imageSrc ? (
          <div className="cropContainer">
            <Cropper
              image={imageSrc}
              crop={crop}
              // rotation={rotation}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              // onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
        ) : (
          <Input
            type="file"
            label="Subir Firma:"
            onChange={onFileChange}
            accept="image/*"
            maxLength={10}
          />
        )}
      </>
      {imageSrc && (
        <div className="controls">
          <Button
            className="controls-btn"
            text="RECORTAR Y GUARDAR"
            type="button"
            onClick={showCroppedImage}
            variant="outline"
          />
          <Button
            className="controls-btn"
            text="DESCARGAR"
            type="button"
            onClick={downloadCroppedImage}
            variant="outline"
          />
          <Button
            className="controls-btn controls-btn-red"
            text="CANCELAR"
            type="button"
            onClick={handleRemoveImageSrc}
            variant="outline"
          />
        </div>
      )}
    </div>
  );
};

export default CardResizing;
