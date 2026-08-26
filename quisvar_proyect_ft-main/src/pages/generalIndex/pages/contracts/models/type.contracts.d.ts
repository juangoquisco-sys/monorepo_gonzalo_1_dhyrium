import type { Specialists } from '@/types/types';

export type ContractType =
  | 'ORDEN_DE_SERVICIO'
  | 'CONTRATO'
  | 'CONTRATACION_DIRECTA';

export interface FilterContract {
  date: string;
  type: ContractType | '';
  status: string;
}

export interface ContractSpecialties {
  id: number;
  listSpecialties: ListSpecialties;
  specialists?: Specialists;
  contratcId: number;
}

export interface ListSpecialties {
  id: number;
  name: string;
  users: Specialists[];
}
