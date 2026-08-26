import type { FrontendLogEvent } from '../models';

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const fullName = (event: FrontendLogEvent) => {
  if (!event.user) return 'Sin usuario';
  const firstName = event.user.profile?.firstName || '';
  const lastName = event.user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || event.user.email;
};

export const levelVariant = (level: string) => {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'ERROR') return 'warning';
  if (level === 'WARNING') return 'info';
  return 'outline';
};

export const statusVariant = (statusCode: number | null) => {
  if (!statusCode) return 'outline';
  if (statusCode >= 500) return 'danger';
  if (statusCode >= 400) return 'warning';
  if (statusCode >= 300) return 'info';
  return 'success';
};

export const typeLabel = (type: string) =>
  type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, letter => letter.toUpperCase());
