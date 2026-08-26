import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { MessageSender, PayMailNumeration } from '@/types/types';
import {
  getMessageTypeFilterValue,
} from '@/utils/files/files.utils';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type {
  MailTypeProcedure,
  ReceptionMailNumeration,
} from '../../../models/types';
import type { PaginationState } from '@tanstack/react-table';
import type {
  OutletProcedureContext,
  QueryProcedure,
} from '../../../interfaces/procedure.types';

const getPayMail = async (
  searchParams: URLSearchParams,
  office: number | null
) => {
  const isReception = searchParams.get('type') === 'RECEPTION';
  const typeMessage = getMessageTypeFilterValue(searchParams.get('typeMessage'));
  const requestParams = new URLSearchParams(searchParams);
  if (office && !isReception) {
    requestParams.set('officeId', String(office));
  } else {
    requestParams.delete('officeId');
  }
  if (typeMessage) {
    requestParams.set('typeMessage', typeMessage);
  } else {
    requestParams.delete('typeMessage');
  }
  if (isReception) {
    const { data } = await axiosInstance.get<ReceptionMailNumeration>(
      'paymail/holding',
      {
        params: requestParams,
        headers: {
          noLoader: true,
        },
      }
    );
    const { mailList, total } = data;
    return { total, listMessage: mailList };
  } else {
    const { data } = await axiosInstance.get<PayMailNumeration>('payMail', {
      params: requestParams,
      headers: {
        noLoader: true,
      },
    });
    const { mailList, total } = data;
    const transformMail = mailList.map(({ paymessage }) => paymessage);
    return { total, listMessage: transformMail };
  }
};

const usePayMail = () => {
  const [searchParams, setSearchParams] = useSearchParams({
    type: 'RECEIVER',
    limit: '50',
    page: '0',
  });

  const { officeId: office } = useOutletContext<OutletProcedureContext>();

  const typeMail = (searchParams.get('type') ?? '') as MailTypeProcedure;
  const status = searchParams.get('status') ?? '';
  const typeMessage = searchParams.get('typeMessage') ?? '';
  const onHolding = searchParams.get('onHolding') ?? '';
  const query: QueryProcedure = {
    typeMail,
    status,
    typeMessage,
    office,
    onHolding,
  };

  const payMailQuery = useQuery({
    queryKey: ['payMail', searchParams.toString(), office],
    queryFn: () => getPayMail(searchParams, office),
  });

  const handleSelectOption = (option: MessageSender) => {
    const keyParam = option === 'ARCHIVER' ? 'status' : 'type';
    const value = option === 'ARCHIVER' ? 'ARCHIVADO' : option;
    let params = {
      limit: '50',
      page: '0',
      [keyParam]: value,
    };
    if (option === 'RECEPTION') params.onHolding = 'true';
    setSearchParams(params);
  };

  const getMessagesPagination = async ({
    pageIndex,
    pageSize,
  }: PaginationState) => {
    searchParams.set('page', String(pageIndex));
    searchParams.set('limit', String(pageSize));
    setSearchParams(searchParams);
  };
  return {
    payMailQuery,
    handleSelectOption,
    getMessagesPagination,
    query,
    searchParams,
  };
};

export default usePayMail;
