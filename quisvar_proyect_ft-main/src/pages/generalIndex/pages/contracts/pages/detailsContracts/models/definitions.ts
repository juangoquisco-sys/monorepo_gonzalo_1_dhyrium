import type { ContractPhasesTitle, PayData, PhaseData } from './type';

export const CONTACT_PHASES_TITLE: ContractPhasesTitle[] = [
  {
    type: 'convocationPhase',
    title: 'Fase de convocatorias',
  },
  {
    type: 'ejecutionPhase',
    title: 'Fase de ejecución',
  },
];

export const INIT_VALUES_PHASE: PhaseData = {
  name: '',
  description: '',
  days: 0,
  isActive: false,
  id: '0',
  payData: [],
};
export const INIT_VALUES_PAY: PayData = {
  id: '0',
  name: '',
  description: '',
  percentage: 0,
  amount: 0,
};
