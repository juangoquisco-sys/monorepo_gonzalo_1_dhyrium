import type { CoorpEntity } from '@/types/types';

export const INDEX_OPTIONS = [
  { id: 14, name: 'CAEC', route: 'contratos' },
  { id: 13, name: 'DEE', route: 'contratos1' },
  { id: 12, name: 'DEP', route: 'contratos2' },
  { id: 11, name: 'CF', route: 'contratos3' },
  { id: 10, name: 'DCA,CC', route: 'contratos4' },
  { id: 9, name: 'SUNAT', route: 'contratos5' },
  { id: 8, name: 'OSCE', route: 'contratos6' },
  { id: 7, name: 'Imagen Inst', route: 'contratos7' },
  { id: 6, name: 'CPE', route: 'contratos8' },
  { id: 5, name: 'DIEB', route: 'contratos8' },
  { id: 4, name: 'DRP', route: 'contratos8' },
  { id: 3, name: 'DPP', route: 'contratos8' },
  { id: 2, name: 'AC', route: 'contratos8' },
  { id: 1, name: 'DTI', route: 'contratos8' },
];

export const DEFAULT_COMPANY: CoorpEntity = {
  id: 0,
  name: 'Dhyrium SAA',
  type: '',
  newId: '',
  urlImg: '/img/quisvar_logo.png',
};
