import type { Contact } from '../../../../../models/types';

export interface HeaderOptionProcedure {
  procedureOpt: 'continue' | 'finish';
  text: string;
}

export interface ProviedForm {
  title: string;
  observations: string;
  numberPage?: number;
  to: Contact;
}
