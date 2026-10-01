import { axiosInstance } from '@/services/axiosInstance';
import { isAxiosError } from 'axios';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

export const reportDesktopOpenError = (error: unknown) => {
  // The HTTP interceptor already displays the precise server/network failure.
  if (isAxiosError(error)) return;
  SnackbarUtilities.error(
    error instanceof Error
      ? error.message
      : 'No se pudo preparar la apertura en Dhyrium Desktop.'
  );
};

export type DhyriumDesktopSourceKind = 'TASK_FILE' | 'BASIC_FILE';

const DESKTOP_PROTOCOL_PATTERN =
  /^dhyrium:\/\/open\/document\?ticket=[A-Za-z0-9_-]{43}$/;

export const isDhyriumDesktopEnabled = () =>
  import.meta.env.VITE_DHYRIUM_DESKTOP_ENABLED === 'true';

export const openWithDhyriumDesktop = async (input: {
  sourceKind: DhyriumDesktopSourceKind;
  sourceFileId: number;
}) => {
  const response = await axiosInstance.post(
    '/desktop/documents/launches',
    input
  );
  const protocolUrl = response.data?.launch?.protocolUrl;
  if (
    typeof protocolUrl !== 'string' ||
    !DESKTOP_PROTOCOL_PATTERN.test(protocolUrl)
  ) {
    throw new Error('Dhyrium no devolvió un enlace de apertura válido.');
  }
  window.location.assign(protocolUrl);
};
