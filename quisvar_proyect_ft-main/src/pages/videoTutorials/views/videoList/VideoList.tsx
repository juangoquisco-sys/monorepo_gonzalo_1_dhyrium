import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LuPlus, LuRefreshCw, LuVideo } from 'react-icons/lu';
import {
  isOpenCardAddVideo$,
  isOpenVideoPlayer$,
} from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';
import CardAddVideo from '../../components/cardAddVideo/CardAddVideo';
import CardVideo from '../../components/cardVideo/CardVideo';
import VideoPlayer from '../../components/videoPlayer/VideoPlayer';
import type { Video } from '../../types/type.res';
import { useTutorialPermissions } from '../../hooks/useTutorialPermissions';
import './videoList.css';

const getVideoTutorialsQueryKey = (folderId: number) => [
  'videoTutorials',
  'videos',
  folderId,
];
const videoSkeletonItems = [
  'skeleton-video-1',
  'skeleton-video-2',
  'skeleton-video-3',
  'skeleton-video-4',
  'skeleton-video-5',
  'skeleton-video-6',
];

const VideoList = () => {
  const { listId, name } = useParams();
  const folderId = Number(listId);
  const queryClient = useQueryClient();
  const { canManageTutorials } = useTutorialPermissions();
  const folderName = useMemo(
    () => (name ? decodeURIComponent(name) : 'Carpeta sin nombre'),
    [name]
  );
  const videosQueryKey = useMemo(
    () => getVideoTutorialsQueryKey(folderId),
    [folderId]
  );

  const handleOpenCard = useCallback(
    (id: number | undefined, selectedFolderId: number) => {
      isOpenCardAddVideo$.setSubject = {
        isOpen: true,
        id,
        folderId: selectedFolderId,
      };
    },
    []
  );

  const videosQuery = useQuery({
    queryKey: videosQueryKey,
    enabled: Boolean(folderId),
    staleTime: 60_000,
    queryFn: async () => {
      const res = await axiosInstance.get<Video[]>(`video/${folderId}`, {
        headers: { noLoader: true },
      });
      return res.data;
    },
  });

  const videos = videosQuery.data || [];
  const hasVideos = videos.length > 0;
  const showSkeleton = videosQuery.isLoading && !hasVideos;
  const showFetchingIndicator = videosQuery.isFetching && hasVideos;
  const hasError = videosQuery.isError && !hasVideos;

  const refreshVideos = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: videosQueryKey });
  }, [queryClient, videosQueryKey]);

  const handleOpenPlayer = (videoUrl: string) => {
    isOpenVideoPlayer$.setSubject = {
      isOpen: true,
      url: videoUrl,
    };
  };

  const openCreateModal = () => {
    if (!folderId) return;
    handleOpenCard(undefined, folderId);
  };

  return (
    <div className="vl-main">
      <header className="vl-header">
        <div>
          <p className="vl-kicker">Carpeta seleccionada</p>
          <h1>{folderName}</h1>
          <p className="vl-subtitle">
            {videos.length === 1
              ? '1 tutorial disponible'
              : `${videos.length} tutoriales disponibles`}
          </p>
        </div>
        {canManageTutorials && (
          <button
            type="button"
            className="vl-add-video"
            onClick={openCreateModal}
          >
            <LuPlus aria-hidden="true" />
            Subir video
          </button>
        )}
      </header>

      {showSkeleton ? (
        <div
          className="vl-video-grid"
          aria-label={`Cargando videos en ${folderName}`}
          aria-live="polite"
        >
          {videoSkeletonItems.map(item => (
            <article
              key={item}
              className="vl-video-skeleton"
              aria-hidden="true"
            >
              <div className="vl-video-skeleton-media" />
              <div className="vl-video-skeleton-body">
                <span />
                <span />
                <span />
              </div>
            </article>
          ))}
        </div>
      ) : hasError ? (
        <div className="vl-state vl-state--error" role="alert">
          <LuRefreshCw aria-hidden="true" />
          <h2>No se pudo cargar la carpeta</h2>
          <p>No se pudieron cargar los videos de esta carpeta.</p>
          <button type="button" onClick={() => void videosQuery.refetch()}>
            Reintentar
          </button>
        </div>
      ) : !hasVideos ? (
        <div className="vl-state">
          <LuVideo aria-hidden="true" />
          <h2>Esta carpeta aun no tiene videos</h2>
          <p>
            {canManageTutorials
              ? 'Sube el primer tutorial para que el equipo pueda encontrarlo desde esta biblioteca.'
              : 'Todavia no hay tutoriales disponibles en esta carpeta.'}
          </p>
          {canManageTutorials && (
            <button type="button" onClick={openCreateModal}>
              <LuPlus aria-hidden="true" />
              Subir primer video
            </button>
          )}
        </div>
      ) : (
        <>
          {showFetchingIndicator && (
            <p className="vl-fetching" aria-live="polite">
              Actualizando videos...
            </p>
          )}
          <div className="vl-video-grid" aria-label={`Videos en ${folderName}`}>
            {videos.map(video => (
              <CardVideo
                key={video.id}
                item={video}
                viewVideo={handleOpenPlayer}
                onSave={refreshVideos}
                editVideo={() => handleOpenCard(video.id, video.folderId)}
              />
            ))}
          </div>
        </>
      )}

      {canManageTutorials && <CardAddVideo onSave={refreshVideos} />}
      <VideoPlayer />
    </div>
  );
};

export default VideoList;
