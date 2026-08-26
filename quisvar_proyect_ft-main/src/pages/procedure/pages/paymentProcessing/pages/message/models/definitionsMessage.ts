import type { HeaderOptionProcedure } from './types';
import type { Transition } from 'framer-motion';

export const SPRING: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 30,
};

export const HEADER_OPTION: HeaderOptionProcedure[] = [
  { procedureOpt: 'continue', text: 'Continuar trámite' },
  { procedureOpt: 'finish', text: 'Finalizar tramite' },
];

export const PAY_TYPE_OPTIONS = [
  { id: 'EFECTIVO', value: 'EFECTIVO' },
  { id: 'CUENTA', value: 'CUENTA' },
  { id: 'CHEQUE', value: 'CHEQUE' },
];

export const YEAR = new Date().getFullYear();
