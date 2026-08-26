import { createContext } from 'react';

import type { MessageType } from '@/types/types';
import type { MessagePermission } from '../../../../models/definitionsMail.models';

interface RegularProcedureInfoContextProps {
  getMessage: () => void;
  hasPermission: (permission: MessagePermission) => boolean;
  handleClose: () => void;
  handleFinish: () => void;
  reloadMessages: () => void;
  message: MessageType;
}

export const RegularProcedureInfoContext = createContext(
  {} as RegularProcedureInfoContextProps
);
