import type { AddTask } from '@/types/types';

export type SubTaskForm = {
  id: number | null;
  name: string;
  description?: string;
  days: number;
  type?: AddTask;
};

export const OPTION_LEVEL_TEXT = {
  duplicate: 'Duplicar nivel',
  upperAdd: 'Agregar nivel arriba',
  edit: 'Editar nivel',
  lowerAdd: 'Agregar nivel abajo',
};
export const COST_DATA = [
  {
    key: 'intern',
    value: 'Practicante',
  },
  {
    key: 'graduate',
    value: 'Egresado',
  },
  {
    key: 'bachelor',
    value: 'Bachiller',
  },
  {
    key: 'professional',
    value: 'Titulado',
  },
];
