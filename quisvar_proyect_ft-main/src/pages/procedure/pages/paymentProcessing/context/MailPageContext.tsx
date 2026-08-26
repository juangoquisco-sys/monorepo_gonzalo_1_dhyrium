import type { Reception } from '../../../models/types';
import type { UseQueryResult } from '@tanstack/react-query';
import type { MessageType } from '@/types/types';
import { createContext } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import type { QueryProcedure } from '../../../interfaces/procedure.types';

interface MailPageContextProps {
  query: QueryProcedure;
  payMailQuery: UseQueryResult<
    | {
        total: number;
        listMessage: Reception[];
      }
    | {
        total: number;
        listMessage: MessageType[];
      },
    Error
  >;
  hasAccess: boolean;
  paymessageId: string | undefined;
  handleCloseMessage: () => void;
  getMessagesPagination: (data: PaginationState) => Promise<void>;
  searchParams: URLSearchParams;
}

export const MailPageContext = createContext({} as MailPageContextProps);
