import type { PreLiquidationStageStatus } from './recaudadorGrande.types';

export const RECAUDADOR_GRANDE_ROUTES = {
  root: '/mis-tareas/tecnicas/recaudador-grande',
  preLiquidation: '/mis-tareas/tecnicas/recaudador-grande/pre-liquidacion',
  liquidation: '/mis-tareas/tecnicas/recaudador-grande/liquidacion',
} as const;

export const RECAUDADOR_GRANDE_PERMISSION = {
  menu: 'mis-tareas',
  subMenu: 'tecnicas',
  managerRole: 'MOD',
} as const;

export const PRE_LIQUIDATION_STATUS_OPTIONS = [
  { id: 'ALL', name: 'Todos' },
  { id: 'IN_PROGRESS', name: 'En preparación' },
  { id: 'READY_FOR_CONFORMITY', name: 'Pendiente de conformidad' },
  { id: 'CONFORMITY_GRANTED', name: 'Con conformidad' },
] as const;

export const TASK_STATUS_OPTIONS = [
  { id: 'ALL', name: 'Todas' },
  { id: 'REVIEWED', name: 'Por revisar' },
  { id: 'PENDING', name: 'Por hacer' },
  { id: 'DONE', name: 'Con conformidad' },
] as const;

export const PRE_LIQUIDATION_STATUS_UI: Record<
  PreLiquidationStageStatus,
  { label: string; badgeVariant: 'info' | 'warning' | 'success' }
> = {
  IN_PROGRESS: {
    label: 'En preparación',
    badgeVariant: 'info',
  },
  READY_FOR_CONFORMITY: {
    label: 'Pendiente de conformidad',
    badgeVariant: 'warning',
  },
  CONFORMITY_GRANTED: {
    label: 'Con conformidad',
    badgeVariant: 'success',
  },
};

export const DEFAULT_LIQUIDATION_DESCRIPTION =
  'Por medio del presente solicito la liquidación correspondiente a la etapa seleccionada, conforme al sustento de tareas con conformidad.';
