import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { AxiosError } from 'axios';
import { Subscription } from 'rxjs';
import { useForm, useWatch } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import {
  LuCircleCheck,
  LuDraftingCompass,
  LuFileArchive,
  LuFileCog,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileText,
  LuFileVideo,
  LuPaperclip,
  LuRefreshCw,
  LuTrash2,
  LuTriangleAlert,
  LuUpload,
  LuX,
} from 'react-icons/lu';
import { RxCrossCircled } from 'react-icons/rx';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import TextArea from '@/components/textArea/TextArea';
import {
  isOpenAlertConfirm$,
  isOpenCardAddVideo$,
} from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';
import { folderService } from '../../services/folderVideos.service';
import {
  formatDuration,
  formatFileSize,
  MAX_VIDEO_SIZE_BYTES,
  useVideoUpload,
} from '../../hooks/useVideoUpload';
import type { VideoUploaderStatus } from '../../hooks/useVideoUpload';
import type { Video } from '../../types/type.res';
import {
  formatMaterialSize,
  isMacroEnabledMaterial,
  MAX_TUTORIAL_MATERIALS,
  MAX_TUTORIAL_MATERIALS_TOTAL_BYTES,
  TUTORIAL_MATERIAL_ACCEPT,
  tutorialMaterialExtension,
  tutorialMaterialKind,
  validateTutorialMaterialSelection,
} from '../../utils/tutorialMaterials';
import { tutorialMediaUrl } from '../../utils/tutorialMedia';
import './cardAddVideo.css';

interface CardAddVideoProps {
  onSave: () => void;
}

interface EditFiles {
  id: number;
  name: string;
  path: string;
  videoId: number;
  sizeBytes: number;
}

type FileType = File | EditFiles;
type VideoWithDocs = Video & { docs?: EditFiles[] };

const SUCCESS_DELAY_MS = 650;

const uploaderStatusCopy: Record<VideoUploaderStatus, string> = {
  idle: 'Selecciona o arrastra un video para empezar.',
  'drag-over': 'Suelta el video para revisarlo.',
  selected: 'Video seleccionado.',
  validating: 'Validando archivo y preparando vista previa.',
  'preparing-preview': 'Preparando vista previa.',
  preview: 'Vista previa lista. Completa los datos y guarda.',
  uploading: 'Subiendo video.',
  success: 'Video guardado correctamente.',
  error: 'Revisa el mensaje de error antes de continuar.',
  cancelled: 'Carga cancelada. Puedes reintentar o cambiar el archivo.',
  retrying: 'Reintentando la subida.',
};

const wait = (time: number) =>
  new Promise(resolve => {
    window.setTimeout(resolve, time);
  });

const dataURLToBlob = (dataUrl: string) => {
  const [metadata, data] = dataUrl.split(',');
  const mime = metadata.match(/:(.*?);/)?.[1] || 'image/png';
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index++) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
};

const isEditFile = (file: FileType): file is EditFiles => 'id' in file;

const materialSize = (file: FileType) =>
  isEditFile(file) ? file.sizeBytes : file.size;

const MaterialTypeIcon = ({ filename }: { filename: string }) => {
  const kind = tutorialMaterialKind(filename);
  if (kind === 'spreadsheet') return <LuFileSpreadsheet aria-hidden="true" />;
  if (kind === 'image') return <LuFileImage aria-hidden="true" />;
  if (kind === 'plan') return <LuDraftingCompass aria-hidden="true" />;
  if (kind === 'technical') return <LuFileCog aria-hidden="true" />;
  if (kind === 'archive') return <LuFileArchive aria-hidden="true" />;
  return <LuFileText aria-hidden="true" />;
};

const MaterialImagePreview = ({
  file,
  mediaTicket,
}: {
  file: FileType;
  mediaTicket: string;
}) => {
  const previewUrl = useMemo(
    () =>
      isEditFile(file)
        ? tutorialMediaUrl('material', file.id, mediaTicket)
        : URL.createObjectURL(file),
    [file, mediaTicket]
  );

  useEffect(() => {
    if (isEditFile(file)) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [file, previewUrl]);

  return previewUrl ? (
    <img className="cav-material-thumbnail" src={previewUrl} alt="" />
  ) : (
    <span className="cav-material-icon cav-material-icon--image">
      <LuFileImage aria-hidden="true" />
    </span>
  );
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
};

const CardAddVideo = ({ onSave }: CardAddVideoProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasId, setHasId] = useState<number>();
  const [folderId, setFolderId] = useState<number>();
  const [mediaTicket, setMediaTicket] = useState('');
  const [files, setFiles] = useState<FileType[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingVideoData, setIsFetchingVideoData] = useState(false);
  const { control, handleSubmit, register, reset } = useForm<Video>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);
  const uploader = useVideoUpload();
  const resetUploader = uploader.reset;

  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const existingMiniature = useWatch({ control, name: 'miniature' });
  const existingVideoUrl = useWatch({ control, name: 'url' });
  const hasExistingMiniature =
    typeof existingMiniature === 'string' && existingMiniature.length > 0;
  const hasExistingVideo =
    typeof existingVideoUrl === 'string' && existingVideoUrl.length > 0;
  const totalMaterialBytes = files.reduce(
    (total, file) => total + materialSize(file),
    0
  );
  const isUploadActive =
    uploader.status === 'uploading' || uploader.status === 'retrying';
  const canEditForm = !isSaving && !isFetchingVideoData;
  const liveMessage =
    formError ||
    fileError ||
    uploader.error ||
    formSuccess ||
    uploaderStatusCopy[uploader.status];

  const getVideoData = useCallback(
    async (id: number) => {
      setIsFetchingVideoData(true);
      setFormError(null);
      try {
        const res = await axiosInstance.get<VideoWithDocs>(`video/info/${id}`);
        reset({
          title: res.data.title,
          description: res.data.description || '',
          url: res.data.url,
          miniature: res.data.miniature || '',
          folderId: res.data.folderId,
        });
        setFiles(res.data.docs || []);
        setMediaTicket(res.data.mediaTicket);
      } catch (error) {
        setFormError(
          resolveErrorMessage(
            error,
            'No se pudo cargar la informacion del video.'
          )
        );
      } finally {
        setIsFetchingVideoData(false);
      }
    },
    [reset]
  );

  useEffect(() => {
    handleIsOpen.current = isOpenCardAddVideo$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setHasId(value.id);
      setFolderId(value.folderId);
      setFormError(null);
      setFileError(null);
      setFormSuccess(null);
      setMediaTicket('');
      resetUploader();
    });

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, [resetUploader]);

  useEffect(() => {
    if (!hasId) return undefined;
    const fetchTimeout = window.setTimeout(() => void getVideoData(hasId), 0);
    return () => window.clearTimeout(fetchTimeout);
  }, [getVideoData, hasId]);

  const closeFunctions = useCallback(() => {
    setIsOpen(false);
    setHasId(undefined);
    setFolderId(undefined);
    setFiles([]);
    setMediaTicket('');
    setFormError(null);
    setFileError(null);
    setFormSuccess(null);
    setIsSaving(false);
    resetUploader();
    reset({
      title: '',
      description: '',
      url: '',
      miniature: '',
    });
  }, [reset, resetUploader]);

  const handleProgress = useCallback(
    (loaded: number, total?: number) => {
      if (!total) return;
      uploader.setUploadProgress((loaded / total) * 100);
    },
    [uploader]
  );

  const uploadSelectedVideo = useCallback(
    async (videoId?: number) => {
      if (!uploader.file || !uploader.thumbnail) {
        setFormError('Selecciona un video valido antes de guardar.');
        return false;
      }

      const formData = new FormData();
      const thumbnailBlob = dataURLToBlob(uploader.thumbnail);
      formData.append('url', uploader.file);
      formData.append('miniature', thumbnailBlob, 'thumbnail.png');

      const retrying =
        uploader.status === 'error' || uploader.status === 'cancelled';
      const controller = uploader.startUpload(retrying);
      const requestConfig = {
        headers: {
          'Content-type': 'multipart/form-data',
          noLoader: true,
        },
        signal: controller.signal,
        onUploadProgress: (event: { loaded: number; total?: number }) =>
          handleProgress(event.loaded, event.total),
      };

      try {
        if (videoId) {
          await axiosInstance.patch(
            `video/url/${videoId}`,
            formData,
            requestConfig
          );
        } else {
          formData.append('title', title || '');
          formData.append('description', description || '');
          formData.append('folderId', folderId?.toString() || '');
          files.forEach(file => {
            if (file instanceof File) formData.append('docs', file);
          });
          await axiosInstance.post('/video', formData, requestConfig);
        }
        uploader.markSuccess();
        return true;
      } catch (error) {
        if (error instanceof AxiosError && error.code === 'ERR_CANCELED') {
          return false;
        }
        uploader.setError(
          resolveErrorMessage(
            error,
            'No se pudo subir el video. Reintenta la carga.'
          )
        );
        return false;
      }
    },
    [description, files, folderId, handleProgress, title, uploader]
  );

  const onSubmit: SubmitHandler<Video> = async () => {
    setFormError(null);
    setFormSuccess(null);

    if (
      uploader.status === 'validating' ||
      uploader.status === 'preparing-preview'
    ) {
      setFormError('Espera a que termine la preparacion de la vista previa.');
      return;
    }

    if (
      uploader.status === 'error' &&
      (uploader.errorType === 'validation' || uploader.errorType === 'preview')
    ) {
      setFormError('Cambia el archivo de video antes de guardar.');
      return;
    }

    if (!hasId && !uploader.file) {
      setFormError('Selecciona un video para crear el tutorial.');
      return;
    }

    setIsSaving(true);
    try {
      if (hasId) {
        await axiosInstance.patch(
          `video/${hasId}`,
          {
            title: title || '',
            description: description || '',
          },
          { headers: { noLoader: true } }
        );

        if (uploader.file) {
          const uploaded = await uploadSelectedVideo(hasId);
          if (!uploaded) return;
          setFormSuccess('Video actualizado correctamente.');
          await wait(SUCCESS_DELAY_MS);
        } else {
          setFormSuccess('Datos actualizados correctamente.');
          await wait(SUCCESS_DELAY_MS);
        }

        onSave();
        closeFunctions();
        return;
      }

      const uploaded = await uploadSelectedVideo();
      if (!uploaded) return;
      folderService.getFolders();
      onSave();
      setFormSuccess('Video guardado correctamente.');
      await wait(SUCCESS_DELAY_MS);
      closeFunctions();
    } catch (error) {
      setFormError(
        resolveErrorMessage(error, 'No se pudieron guardar los cambios.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFormError(null);
    setFormSuccess(null);
    void uploader.selectFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    uploader.endDrag();
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length > 1) {
      setFormError('Sube un solo video por tutorial.');
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    void uploader.selectFile(droppedFiles[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    uploader.beginDrag();
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    uploader.endDrag();
  };

  const validateMaterials = (selectedFiles: File[]) =>
    validateTutorialMaterialSelection(
      files.map(file => ({
        name: file.name,
        sizeBytes: materialSize(file),
      })),
      selectedFiles
    );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validationError = validateMaterials(selectedFiles);
    if (validationError) {
      setFileError(validationError);
      event.target.value = '';
      return;
    }
    setFileError(null);
    setFiles(prev => [...prev, ...selectedFiles]);
    event.target.value = '';
  };

  const handleAddFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;
    const validationError = validateMaterials(selectedFiles);
    if (validationError) {
      setFileError(validationError);
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('docs', file);
    });

    try {
      setFileError(null);
      setIsSaving(true);
      await axiosInstance.post(`video/doc/${hasId}`, formData, {
        headers: {
          'Content-type': 'multipart/form-data',
          noLoader: true,
        },
      });
      if (hasId) await getVideoData(hasId);
    } catch (error) {
      setFileError(
        resolveErrorMessage(error, 'No se pudieron adjuntar los archivos.')
      );
    } finally {
      setIsSaving(false);
      event.target.value = '';
    }
  };

  const removeFile = (id: number) => {
    setFiles(prev => prev.filter((_, index) => index !== id));
  };

  const deleteFile = async (file: EditFiles) => {
    try {
      setFileError(null);
      await axiosInstance.delete(`video/doc/${file.id}`, {
        headers: { noLoader: true },
      });
      if (hasId) await getVideoData(hasId);
    } catch (error) {
      setFileError(
        resolveErrorMessage(error, 'No se pudo eliminar el material adjunto.')
      );
    }
  };

  const confirmDeleteFile = (file: EditFiles) => {
    // The sharing service intentionally exposes an RxJS-backed setter.
    // eslint-disable-next-line react-hooks/immutability
    isOpenAlertConfirm$.setSubject = {
      isOpen: true,
      variant: 'danger',
      title: 'Eliminar material adjunto',
      description:
        'Esta acción quitará el archivo de apoyo asociado a este tutorial.',
      summaryItems: [{ label: 'Archivo', value: file.name }],
      warningText: 'Esta accion no se puede deshacer.',
      confirmText: 'Eliminar archivo',
      cancelText: 'Cancelar',
      onConfirm: () => deleteFile(file),
    };
  };

  const deleteOnlyVideo = async () => {
    if (!hasId) return;

    try {
      setFormError(null);
      setIsSaving(true);
      await axiosInstance.delete(`video/url/${hasId}`, {
        headers: { noLoader: true },
      });
      await getVideoData(hasId);
      onSave();
      setFormSuccess('Video eliminado. Puedes cargar uno nuevo.');
    } catch (error) {
      setFormError(resolveErrorMessage(error, 'No se pudo eliminar el video.'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteOnlyVideo = () => {
    isOpenAlertConfirm$.setSubject = {
      isOpen: true,
      variant: 'danger',
      title: 'Eliminar video actual',
      description:
        'Esta accion quitara el archivo de video del tutorial en edicion.',
      summaryItems: [
        {
          label: 'Video',
          value: title || 'Video tutorial',
        },
      ],
      warningText:
        'El registro del tutorial permanecera, pero deberas cargar un reemplazo para que pueda reproducirse.',
      confirmText: 'Eliminar video',
      cancelText: 'Cancelar',
      onConfirm: deleteOnlyVideo,
    };
  };

  const dropZoneClass = [
    'cav-dropzone',
    uploader.status === 'drag-over' ? 'cav-dropzone--drag' : '',
    uploader.previewUrl ? 'cav-dropzone--preview' : '',
    uploader.status === 'error' ? 'cav-dropzone--error' : '',
    uploader.status === 'success' ? 'cav-dropzone--success' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const uploadStepClass = (
    step: 'selected' | 'validating' | 'preview' | 'uploading'
  ) => {
    const completeSteps: Record<typeof step, VideoUploaderStatus[]> = {
      selected: [
        'selected',
        'validating',
        'preparing-preview',
        'preview',
        'uploading',
        'retrying',
        'success',
      ],
      validating: [
        'preparing-preview',
        'preview',
        'uploading',
        'retrying',
        'success',
      ],
      preview: ['preview', 'uploading', 'retrying', 'success'],
      uploading: ['uploading', 'retrying', 'success'],
    };
    const active =
      completeSteps[step].includes(uploader.status) ||
      (step === 'uploading' && uploader.status === 'cancelled');
    return `cav-film-step ${active ? 'cav-film-step--active' : ''}`;
  };

  return (
    <Modal
      size={74}
      isOpenProp={isOpen}
      contentClassName="cav-modal"
      ariaLabelledBy="video-uploader-title"
      ariaDescribedBy="video-uploader-description"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="cav-main">
        <button
          type="button"
          className="cav-close"
          onClick={closeFunctions}
          aria-label="Cerrar editor de video"
        >
          <LuX aria-hidden="true" />
        </button>

        <header className="cav-header">
          <div>
            <p className="cav-kicker">Biblioteca de tutoriales</p>
            <h1 id="video-uploader-title" className="cav-title">
              {hasId ? 'Editar video' : 'Agregar nuevo video'}
            </h1>
            <p id="video-uploader-description" className="cav-subtitle">
              Revisa el archivo, confirma la miniatura y guarda el tutorial en
              la carpeta actual.
            </p>
          </div>
          <div className="cav-limit">
            <LuFileVideo aria-hidden="true" />
            <span>Video hasta {formatFileSize(MAX_VIDEO_SIZE_BYTES)}</span>
          </div>
        </header>

        <p className="cav-live" aria-live="polite">
          {liveMessage}
        </p>

        <div className="cav-workbench">
          <section className="cav-ingest" aria-label="Carga de video">
            <div
              className={dropZoneClass}
              role="group"
              aria-labelledby="video-dropzone-title"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="video-uploader-input"
                ref={videoInputRef}
                className="cav-video-input"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/matroska,application/x-matroska,.mp4,.webm,.mov,.mkv"
                onChange={handleVideoInputChange}
                disabled={isUploadActive || isSaving}
                aria-describedby="video-uploader-help"
                aria-label="Seleccionar archivo de video"
              />

              {uploader.previewUrl ? (
                <div className="cav-preview">
                  {uploader.meta?.previewAvailable === false &&
                  uploader.thumbnail ? (
                    <img
                      className="cav-preview-video"
                      src={uploader.thumbnail}
                      alt="Miniatura generica para video MKV"
                    />
                  ) : (
                    <video
                      className="cav-preview-video"
                      src={uploader.previewUrl}
                      poster={uploader.thumbnail || undefined}
                      controls
                      preload="metadata"
                    >
                      Tu navegador no soporta la reproduccion de video.
                    </video>
                  )}
                  <div className="cav-preview-meta">
                    <div>
                      <strong>{uploader.meta?.name}</strong>
                      <span>
                        {formatFileSize(uploader.meta?.size || 0)} ·{' '}
                        {uploader.meta?.previewAvailable === false
                          ? 'MKV sin vista previa en el navegador'
                          : formatDuration(uploader.meta?.duration)}
                      </span>
                    </div>
                    {!isUploadActive && (
                      <div className="cav-preview-actions">
                        <button
                          type="button"
                          className="cav-preview-change"
                          onClick={event => {
                            event.preventDefault();
                            videoInputRef.current?.click();
                          }}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          className="cav-icon-btn"
                          onClick={event => {
                            event.preventDefault();
                            uploader.removeFile();
                          }}
                          aria-label="Eliminar video seleccionado"
                        >
                          <LuTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : hasId && hasExistingVideo ? (
                <div className="cav-existing-video">
                  {hasExistingMiniature ? (
                    <img
                      src={tutorialMediaUrl('thumbnail', hasId, mediaTicket)}
                      alt={`Miniatura de ${title || 'video tutorial'}`}
                      className="cav-existing-thumbnail"
                    />
                  ) : (
                    <div className="cav-existing-placeholder">
                      <LuFileVideo aria-hidden="true" />
                      <span>Video registrado sin miniatura</span>
                    </div>
                  )}
                  <div className="cav-preview-meta">
                    <div>
                      <strong>Video actual</strong>
                      <span>Selecciona otro archivo para reemplazarlo.</span>
                    </div>
                    <button
                      type="button"
                      className="cav-icon-btn cav-icon-btn--danger"
                      onClick={event => {
                        event.preventDefault();
                        confirmDeleteOnlyVideo();
                      }}
                      disabled={isSaving}
                      aria-label="Eliminar video actual"
                    >
                      <LuTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cav-empty">
                  <LuUpload className="cav-empty-icon" aria-hidden="true" />
                  <h2 id="video-dropzone-title">
                    {uploader.status === 'drag-over'
                      ? 'Suelta el video'
                      : 'Cargar video'}
                  </h2>
                  <p id="video-uploader-help">
                    Arrastra un archivo o selecciona manualmente. Formatos: MP4,
                    WebM, MOV o MKV.
                  </p>
                  <button
                    type="button"
                    className="cav-select-action"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadActive || isSaving}
                  >
                    Seleccionar archivo
                  </button>
                </div>
              )}
            </div>

            <div className="cav-filmstrip" aria-hidden="true">
              <span className={uploadStepClass('selected')}>Archivo</span>
              <span className={uploadStepClass('validating')}>Validacion</span>
              <span className={uploadStepClass('preview')}>Preview</span>
              <span className={uploadStepClass('uploading')}>Subida</span>
            </div>

            {(isUploadActive || uploader.status === 'success') && (
              <div className="cav-progress">
                <div className="cav-progress-label">
                  <span>{uploaderStatusCopy[uploader.status]}</span>
                  <strong>{uploader.progress}%</strong>
                </div>
                <div
                  className="cav-progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploader.progress}
                >
                  <span style={{ width: `${uploader.progress}%` }} />
                </div>
              </div>
            )}

            {uploader.error && (
              <div className="cav-message cav-message--error" role="alert">
                <LuTriangleAlert aria-hidden="true" />
                <p>{uploader.error}</p>
              </div>
            )}

            {uploader.status === 'success' && (
              <div className="cav-message cav-message--success" role="status">
                <LuCircleCheck aria-hidden="true" />
                <p>Video guardado y biblioteca actualizada.</p>
              </div>
            )}
          </section>

          <aside className="cav-details" aria-label="Datos del tutorial">
            <div className="cav-field-group">
              <Input
                {...register('title')}
                name="title"
                label="Titulo"
                placeholder="Ej. Registrar asistencia diaria"
                required
                disabled={!canEditForm || isUploadActive}
              />
              <TextArea
                {...register('description')}
                name="description"
                label="Descripcion"
                placeholder="Describe cuando usar este tutorial."
                disabled={!canEditForm || isUploadActive}
              />
            </div>

            <div className="cav-docs">
              <div className="cav-docs-header">
                <div>
                  <h2>Materiales adjuntos</h2>
                  <p>
                    Agrega documentos, hojas de cálculo, imágenes, planos o
                    archivos de apoyo.
                  </p>
                </div>
                <button
                  type="button"
                  className="cav-docs-add"
                  onClick={() => docsInputRef.current?.click()}
                  disabled={
                    isUploadActive ||
                    isSaving ||
                    files.length >= MAX_TUTORIAL_MATERIALS
                  }
                >
                  <LuPaperclip aria-hidden="true" />
                  Adjuntar archivos
                </button>
              </div>

              <p className="cav-files-summary">
                {files.length} de {MAX_TUTORIAL_MATERIALS} archivos ·{' '}
                {formatMaterialSize(totalMaterialBytes)} de{' '}
                {formatMaterialSize(MAX_TUTORIAL_MATERIALS_TOTAL_BYTES)}
              </p>

              {fileError && (
                <div className="cav-message cav-message--error" role="alert">
                  <LuTriangleAlert aria-hidden="true" />
                  <p>{fileError}</p>
                </div>
              )}

              <div className="cav-files">
                {files.length === 0 ? (
                  <p className="cav-files-empty">Sin materiales adjuntos.</p>
                ) : (
                  files.map((file, index) => {
                    const extension =
                      tutorialMaterialExtension(file.name).toUpperCase() ||
                      'ARCHIVO';
                    const size = materialSize(file);
                    const isImage = tutorialMaterialKind(file.name) === 'image';
                    const materialUrl = isEditFile(file)
                      ? tutorialMediaUrl('material', file.id, mediaTicket)
                      : undefined;

                    return (
                      <div
                        key={
                          isEditFile(file) ? file.id : `${file.name}-${index}`
                        }
                        className="cav-file-content"
                      >
                        {isImage ? (
                          <MaterialImagePreview
                            file={file}
                            mediaTicket={mediaTicket}
                          />
                        ) : (
                          <span
                            className={`cav-material-icon cav-material-icon--${tutorialMaterialKind(
                              file.name
                            )}`}
                          >
                            <MaterialTypeIcon filename={file.name} />
                          </span>
                        )}

                        <div className="cav-file-details">
                          {materialUrl ? (
                            <a
                              className="cav-file-name"
                              target="_blank"
                              rel="noreferrer"
                              href={materialUrl}
                            >
                              {file.name}
                            </a>
                          ) : (
                            <p className="cav-file-name">{file.name}</p>
                          )}
                          <span>
                            {extension} · {formatMaterialSize(size)}
                          </span>
                          {isMacroEnabledMaterial(file.name) && (
                            <small>
                              Puede contener macros. Se descargará como archivo.
                            </small>
                          )}
                        </div>

                        <button
                          type="button"
                          className="cav-file-cross"
                          onClick={() =>
                            isEditFile(file)
                              ? confirmDeleteFile(file)
                              : removeFile(index)
                          }
                          disabled={isUploadActive || isSaving}
                          aria-label={`Quitar ${file.name}`}
                        >
                          <RxCrossCircled aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <input
                ref={docsInputRef}
                id="video-docs-input"
                className="cav-hidden-input"
                type="file"
                accept={TUTORIAL_MATERIAL_ACCEPT}
                multiple
                onChange={event =>
                  hasId ? void handleAddFiles(event) : handleFileChange(event)
                }
              />
            </div>
          </aside>
        </div>

        {(formError || formSuccess) && (
          <div
            className={`cav-message ${
              formError ? 'cav-message--error' : 'cav-message--success'
            }`}
            role={formError ? 'alert' : 'status'}
          >
            {formError ? (
              <LuTriangleAlert aria-hidden="true" />
            ) : (
              <LuCircleCheck aria-hidden="true" />
            )}
            <p>{formError || formSuccess}</p>
          </div>
        )}

        <footer className="cav-actions">
          {isUploadActive ? (
            <button
              type="button"
              className="cav-secondary-action"
              onClick={uploader.cancelUpload}
            >
              Cancelar carga
            </button>
          ) : uploader.status === 'error' &&
            uploader.errorType === 'upload' &&
            uploader.file ? (
            <button type="submit" className="cav-secondary-action">
              <LuRefreshCw aria-hidden="true" />
              Reintentar
            </button>
          ) : (
            <Button
              text="Cancelar"
              className="cav-cancel"
              type="button"
              onClick={closeFunctions}
              variant="outline"
            />
          )}

          <Button
            text={hasId ? 'Guardar cambios' : 'Guardar video'}
            className="btn-area"
            type="submit"
            variant="solid"
            disabled={isUploadActive || isSaving || isFetchingVideoData}
          />
        </footer>
      </form>
    </Modal>
  );
};

export default CardAddVideo;
