import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useSelector } from 'react-redux';

import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import UploadFile from '@/components/uploadFile/UploadFile';
import { axiosInstance, URL } from '@/services/axiosInstance';
import type { DialogHandle } from '@/utils/dialog';
import { openDialog } from '@/utils/dialog';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { RootState } from '@/store/store.types';
import type { TypeFileUser } from '@/types/types';
import { normalizeFileName } from '@/utils/tools';
import './uploadUserFile.css';

interface UploadUserFileProps {
  fileName: string;
  onSave?: () => void;
  userId: number | undefined;
  typeFile: TypeFileUser;
}

interface DocumentDeleteConfirmationProps {
  fileName: string;
  url: string;
  onClose: () => void;
  onSave?: () => void | Promise<void>;
}

const DocumentDeleteConfirmation = ({
  fileName,
  url,
  onClose,
  onSave,
}: DocumentDeleteConfirmationProps) => {
  const [isPasswordStep, setIsPasswordStep] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { dni } = useSelector((state: RootState) => state.userSession.profile);

  const handleDelete = async () => {
    if (!password) {
      SnackbarUtilities.warning('Ingrese su contraseña para continuar.');
      return;
    }

    setIsDeleting(true);
    try {
      await axiosInstance.post('/auth/login', {
        dni,
        password,
      });
      await axiosInstance.delete(url);
      await onSave?.();
      SnackbarUtilities.success('Archivo eliminado correctamente.');
      onClose();
    } catch {
      SnackbarUtilities.error(
        'No se pudo eliminar el archivo. Verifique su contraseña e inténtelo nuevamente.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isPasswordStep) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Ingrese su contraseña para eliminar <strong>{fileName}</strong>.
        </p>
        <AppInput
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="Contraseña"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => setIsPasswordStep(false)}
            disabled={isDeleting}
          >
            Volver
          </AppButton>
          <AppButton
            type="button"
            variant="danger"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar archivo'}
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Trash2 aria-hidden="true" className="size-5" />
        </span>
        <p className="pt-1 text-sm text-muted-foreground">
          ¿Está seguro de que desea eliminar <strong>{fileName}</strong>?
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onClose}>
          No, cancelar
        </AppButton>
        <AppButton
          type="button"
          variant="danger"
          onClick={() => setIsPasswordStep(true)}
        >
          Sí, estoy seguro
        </AppButton>
      </div>
    </div>
  );
};

const UploadUserFile = ({
  fileName,
  onSave,
  userId,
  typeFile,
}: UploadUserFileProps) => {
  const fileNameTransform = normalizeFileName(fileName);

  const openDeleteConfirmation = () => {
    let dialogHandle: DialogHandle | null = null;
    const closeDialog = () => dialogHandle?.close();

    dialogHandle = openDialog({
      title: 'Eliminar archivo',
      behavior: 'stack',
      width: 'min(92vw, 32rem)',
      children: (
        <DocumentDeleteConfirmation
          fileName={fileNameTransform}
          url={`/files/removeFileUser/${userId}/${fileName}?typeFile=${typeFile}`}
          onClose={closeDialog}
          onSave={onSave}
        />
      ),
    });

    if (!dialogHandle) {
      SnackbarUtilities.warning(
        'No se pudo abrir la confirmación. Inténtelo nuevamente.'
      );
    }
  };

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
          <AppButton
            type="button"
            variant="ghost"
            size="icon"
            className="uploadUserFile-files-btn-delete"
            onClick={openDeleteConfirmation}
            aria-label={`Eliminar ${fileNameTransform}`}
          >
            <X aria-hidden="true" className="size-4" />
          </AppButton>
        </div>
      )}
    </div>
  );
};

export default UploadUserFile;
