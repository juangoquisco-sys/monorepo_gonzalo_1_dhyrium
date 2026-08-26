import { useCallback, useEffect, useRef, useState } from 'react';

export type VideoUploaderStatus =
  | 'idle'
  | 'drag-over'
  | 'selected'
  | 'validating'
  | 'preparing-preview'
  | 'preview'
  | 'uploading'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'retrying';

type VideoUploaderErrorType = 'validation' | 'preview' | 'upload';

interface VideoFileMeta {
  name: string;
  size: number;
  type: string;
  duration?: number;
  previewAvailable?: boolean;
}

interface VideoUploaderState {
  status: VideoUploaderStatus;
  file?: File;
  previewUrl?: string;
  thumbnail: string | null;
  progress: number;
  error: string | null;
  errorType?: VideoUploaderErrorType;
  meta?: VideoFileMeta;
}

const MAX_VIDEO_SIZE_GB = 10;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_GB * 1024 * 1024 * 1024;
const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/matroska',
  'application/x-matroska',
];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv'];

const initialState: VideoUploaderState = {
  status: 'idle',
  thumbnail: null,
  progress: 0,
  error: null,
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(
      bytes >= 10 * 1024 * 1024 * 1024 ? 0 : 1
    )} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(
    bytes >= 100 * 1024 * 1024 ? 0 : 1
  )} MB`;
};

export const formatDuration = (duration?: number) => {
  if (!duration || !Number.isFinite(duration)) return 'Duracion pendiente';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const getExtension = (fileName: string) =>
  fileName.split('.').pop()?.toLowerCase() || '';

const isMkvFile = (file: File) =>
  getExtension(file.name) === 'mkv' ||
  ['video/x-matroska', 'video/matroska', 'application/x-matroska'].includes(
    file.type
  );

const validateVideoFile = (file: File) => {
  const extension = getExtension(file.name);
  const isVideoMime = ALLOWED_VIDEO_MIME_TYPES.includes(file.type);
  const hasVideoExtension = ALLOWED_VIDEO_EXTENSIONS.includes(extension);

  if (!isVideoMime && !hasVideoExtension) {
    return 'Selecciona un archivo de video valido: MP4, WebM, MOV o MKV.';
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `El video pesa ${formatFileSize(
      file.size
    )}. El limite recomendado para tutoriales es ${MAX_VIDEO_SIZE_GB} GB.`;
  }

  return null;
};

const createVideoThumbnail = (
  file: File,
  previewUrl: string
): Promise<{ thumbnail: string; duration?: number }> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = previewUrl;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const seekTime =
        Number.isFinite(duration) && duration > 2
          ? Math.min(2, duration / 2)
          : 0;
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;
      canvas.width = 640;
      canvas.height = Math.max(1, Math.round((height / width) * canvas.width));
      const context = canvas.getContext('2d');
      if (!context) {
        cleanup();
        reject(new Error('No se pudo leer la imagen del video.'));
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/png');
      cleanup();
      resolve({ thumbnail, duration: video.duration });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`No se pudo preparar la vista previa de ${file.name}.`));
    };
  });

const createMkvFallbackThumbnail = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 640, 360);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(1, '#334155');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#f8fafc';
  context.font = '700 72px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('MKV', canvas.width / 2, canvas.height / 2 - 16);

  context.fillStyle = '#cbd5e1';
  context.font = '400 24px sans-serif';
  context.fillText(
    'Vista previa no disponible',
    canvas.width / 2,
    canvas.height / 2 + 56
  );

  return canvas.toDataURL('image/png');
};

export const useVideoUpload = () => {
  const [state, setState] = useState<VideoUploaderState>(initialState);
  const previewUrlRef = useRef<string | undefined>(undefined);
  const selectionIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = undefined;
    }
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    selectionIdRef.current += 1;
    revokePreviewUrl();
    setState(initialState);
  }, [revokePreviewUrl]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      revokePreviewUrl();
    },
    [revokePreviewUrl]
  );

  const setError = useCallback(
    (message: string, errorType: VideoUploaderErrorType = 'upload') => {
      setState(prev => ({
        ...prev,
        status: 'error',
        progress: prev.progress,
        error: message,
        errorType,
      }));
    },
    []
  );

  const selectFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      const validationError = validateVideoFile(file);
      selectionIdRef.current += 1;
      const selectionId = selectionIdRef.current;
      revokePreviewUrl();

      const meta: VideoFileMeta = {
        name: file.name,
        size: file.size,
        type: file.type || `video/${getExtension(file.name)}`,
      };

      if (validationError) {
        setState({
          status: 'error',
          file,
          thumbnail: null,
          progress: 0,
          error: validationError,
          errorType: 'validation',
          meta,
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      setState({
        status: 'preparing-preview',
        file,
        previewUrl,
        thumbnail: null,
        progress: 0,
        error: null,
        meta,
      });

      try {
        const thumbnailData = await createVideoThumbnail(file, previewUrl);
        if (selectionIdRef.current !== selectionId) return;
        setState({
          status: 'preview',
          file,
          previewUrl,
          thumbnail: thumbnailData.thumbnail,
          progress: 0,
          error: null,
          meta: {
            ...meta,
            duration: thumbnailData.duration,
            previewAvailable: true,
          },
        });
      } catch {
        if (selectionIdRef.current !== selectionId) return;
        if (isMkvFile(file)) {
          const fallbackThumbnail = createMkvFallbackThumbnail();
          if (fallbackThumbnail) {
            setState({
              status: 'preview',
              file,
              previewUrl,
              thumbnail: fallbackThumbnail,
              progress: 0,
              error: null,
              meta: {
                ...meta,
                previewAvailable: false,
              },
            });
            return;
          }
        }
        setState({
          status: 'error',
          file,
          previewUrl,
          thumbnail: null,
          progress: 0,
          error:
            'El archivo parece ser video, pero no se pudo generar la vista previa. Prueba con MP4 o WebM.',
          errorType: 'preview',
          meta,
        });
      }
    },
    [revokePreviewUrl]
  );

  const beginDrag = useCallback(() => {
    setState(prev =>
      prev.status === 'uploading' || prev.status === 'retrying'
        ? prev
        : { ...prev, status: 'drag-over', error: null }
    );
  }, []);

  const endDrag = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'drag-over') return prev;
      if (prev.file && prev.thumbnail) return { ...prev, status: 'preview' };
      if (prev.file) return { ...prev, status: 'selected' };
      return { ...prev, status: 'idle' };
    });
  }, []);

  const removeFile = useCallback(() => {
    selectionIdRef.current += 1;
    revokePreviewUrl();
    setState(initialState);
  }, [revokePreviewUrl]);

  const startUpload = useCallback((retrying = false) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setState(prev => ({
      ...prev,
      status: retrying ? 'retrying' : 'uploading',
      progress: retrying ? prev.progress : 0,
      error: null,
      errorType: undefined,
    }));
    return controller;
  }, []);

  const setUploadProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, Math.round(progress))),
    }));
  }, []);

  const markSuccess = useCallback(() => {
    abortControllerRef.current = null;
    setState(prev => ({
      ...prev,
      status: 'success',
      progress: 100,
      error: null,
      errorType: undefined,
    }));
  }, []);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(prev => ({
      ...prev,
      status: 'cancelled',
      error: 'Carga cancelada. Puedes cambiar el archivo o reintentar.',
      errorType: 'upload',
    }));
  }, []);

  return {
    ...state,
    beginDrag,
    cancelUpload,
    endDrag,
    markSuccess,
    removeFile,
    reset,
    selectFile,
    setError,
    setUploadProgress,
    startUpload,
  };
};
