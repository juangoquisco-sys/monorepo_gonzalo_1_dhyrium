import { useState } from 'react';
import type {
  MailTypeProcedure,
  MailTypeProcedureSpanish,
  OptionsMailHeader,
} from '../models/types';

const useSelectReceiver = (
  typesProcedure: MailTypeProcedureSpanish[] = [
    'ARCHIVADOS',
    'ENVIADOS',
    'RECIBIDOS',
    'MESA DE PARTES',
  ]
) => {
  const [typeMail, setTypeMail] = useState<MailTypeProcedure>('RECEIVER');
  const handleSelectReceiver = (type: MailTypeProcedure) => setTypeMail(type);
  const optionsMailHeader: OptionsMailHeader[] = [
    {
      id: 1,
      iconOn: 'inbox',
      iconOff: 'inbox-black',
      text: 'RECIBIDOS',
      isActive: typeMail === 'RECEIVER',
      funcion: () => handleSelectReceiver('RECEIVER'),
    },
    {
      id: 2,
      iconOn: 'tabler',
      iconOff: 'tabler-black',
      text: 'ENVIADOS',
      isActive: typeMail === 'SENDER',
      funcion: () => handleSelectReceiver('SENDER'),
    },
    {
      id: 3,
      iconOn: 'archiver-box',
      iconOff: 'archiver-box-black',
      text: 'ARCHIVADOS',
      isActive: typeMail === 'ARCHIVER',
      funcion: () => handleSelectReceiver('ARCHIVER'),
    },
    {
      id: 4,
      iconOn: 'desk-filled',
      iconOff: 'desk-regular',
      text: 'MESA DE PARTES',
      isActive: typeMail === 'RECEPTION',
      funcion: () => handleSelectReceiver('RECEPTION'),
    },
  ];

  const optionMailFilter = optionsMailHeader.filter(optMail =>
    typesProcedure.includes(optMail.text)
  );
  return { typeMail, optionsMailHeader: optionMailFilter };
};

export default useSelectReceiver;
