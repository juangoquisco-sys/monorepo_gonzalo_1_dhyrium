export enum TypeStatus {
  REVIEWED = 'ADELANTO',
  APPROVED = 'LIQUIDACION',
  MONTH = 'MENSUAL',
}

export interface Collaborator {
  id: number;
  fullName: string;
  percentage: number;
}
