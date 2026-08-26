import { useId, useState } from 'react';
import { LuFileVideo, LuPencil, LuPlay, LuTrash2 } from 'react-icons/lu';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenAlertConfirm$ } from '@/services/sharingSubject';
import './cardVideo.css';
import type { Video } from '../../types/type.res';
import { useTutorialPermissions } from '../../hooks/useTutorialPermissions';
import { tutorialMediaUrl } from '../../utils/tutorialMedia';

interface CardVideoProps {
  item: Video;
  viewVideo: (url: string) => void;
  editVideo: () => void;
  onSave: () => void | Promise<void>;
}

const CardVideo = ({ item, viewVideo, editVideo, onSave }: CardVideoProps) => {
  const { canManageTutorials } = useTutorialPermissions();
  const [error, setError] = useState<string | null>(null);
  const titleInputId = useId();

  const videoUrl = tutorialMediaUrl('video', item.id, item.mediaTicket);
  const thumbnailUrl = item.miniature
    ? tutorialMediaUrl('thumbnail', item.id, item.mediaTicket)
    : '';

  const deleteVideo = async () => {
    setError(null);
    try {
      await axiosInstance.delete(`video/${item.id}`, {
        headers: { noLoader: true },
      });
      await onSave();
    } catch {
      setError('No se pudo eliminar el video.');
    }
  };

  const confirmDeleteVideo = () => {
    isOpenAlertConfirm$.setSubject = {
      isOpen: true,
      variant: 'danger',
      title: 'Eliminar video',
      description:
        'Esta accion quitara el tutorial de la biblioteca y actualizara la lista.',
      summaryItems: [{ label: 'Video', value: item.title }],
      warningText: 'Esta accion no se puede deshacer.',
      confirmText: 'Eliminar video',
      cancelText: 'Cancelar',
      onConfirm: deleteVideo,
    };
  };

  return (
    <article className="cv-main" aria-labelledby={titleInputId}>
      <div className="cv-video">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="cv-thumbnail" />
        ) : (
          <div className="cv-thumbnail-placeholder">
            <LuFileVideo aria-hidden="true" />
          </div>
        )}

        <button
          type="button"
          className="cv-play-button"
          onClick={() => viewVideo(videoUrl)}
          aria-label={`Reproducir ${item.title}`}
        >
          <LuPlay aria-hidden="true" />
        </button>
      </div>

      <div className="cv-body">
        <div className="cv-title-row">
          <h2 id={titleInputId} className="cv-title">
            {item.title}
          </h2>

          {canManageTutorials && (
            <div
              className="cv-actions"
              aria-label={`Acciones de ${item.title}`}
            >
              <button
                type="button"
                className="cv-action"
                onClick={editVideo}
                aria-label={`Editar ${item.title}`}
              >
                <LuPencil aria-hidden="true" />
              </button>
              <button
                type="button"
                className="cv-action cv-action--danger"
                onClick={confirmDeleteVideo}
                aria-label={`Eliminar ${item.title}`}
              >
                <LuTrash2 aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {item.description ? (
          <p className="cv-description">{item.description}</p>
        ) : (
          <p className="cv-description cv-description--empty">
            Sin descripcion registrada.
          </p>
        )}

        {error && (
          <p id={`${titleInputId}-error`} className="cv-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
};

export default CardVideo;
