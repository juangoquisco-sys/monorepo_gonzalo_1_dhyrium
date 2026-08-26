export type ContractPhases = 'ejecutionPhase' | 'convocationPhase';
export interface ContractPhasesTitle {
  type: ContractPhases;
  title: string;
}

export interface PhaseData {
  id: string;
  name: string;
  description: string;
  days: number;
  realDay?: number;
  isActive: boolean;
  payData: PayData[];
}

interface PayData {
  id: string;
  name: string;
  description: string;
  percentage: number;
  amount: number;
}
