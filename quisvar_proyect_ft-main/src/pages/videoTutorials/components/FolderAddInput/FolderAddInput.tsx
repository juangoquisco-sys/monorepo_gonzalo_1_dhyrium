import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import './folderAddInput.css';
import Input from '@/components/Input/Input';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { axiosInstance } from '@/services/axiosInstance';
import { useEffect, useState } from 'react';
import { LuCheck, LuX } from 'react-icons/lu';
interface FolderName {
  name: string;
}
interface FolderAddProps {
  onSave: () => void;
  setBtnActive: () => void;
  id?: number | null;
  nameEdit?: string | null;
  route?: string;
}
const FolderAddInput = ({
  onSave,
  setBtnActive,
  id,
  nameEdit = null,
  route = 'folderVideos',
}: FolderAddProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<FolderName>();
  useEffect(() => {
    if (nameEdit) {
      reset({ name: nameEdit });
    }
  }, [nameEdit, reset]);

  const onSubmit: SubmitHandler<FolderName> = async () => {
    const data = {
      name: watch('name'),
      parentId: id,
    };
    setError(null);
    setIsSaving(true);
    try {
      if (nameEdit) {
        await axiosInstance.patch(`${route}/${id}`, { name: watch('name') });
      } else {
        await axiosInstance.post(`${route}`, data);
      }
      setBtnActive();
      reset();
      onSave();
    } catch {
      setError('No se pudo guardar la carpeta.');
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <form
      className="fa-add-input"
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
    >
      <Input
        placeholder="Nombre"
        className="fa-header-add-btn"
        {...register('name', {
          validate: { validateWhiteSpace, validateCorrectTyping },
        })}
        name="name"
        required={true}
        errors={errors}
        aria-describedby={error ? 'folder-add-error' : undefined}
        disabled={isSaving}
      />
      <div className="fa-icon-area">
        <button
          type="submit"
          className="fa-icon-action"
          disabled={isSaving}
          aria-label={nameEdit ? 'Guardar nombre de carpeta' : 'Crear carpeta'}
        >
          <LuCheck aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setBtnActive();
            reset();
          }}
          className="fa-icon-action"
          disabled={isSaving}
          aria-label="Cancelar edicion de carpeta"
        >
          <LuX aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id="folder-add-error" className="fa-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default FolderAddInput;
