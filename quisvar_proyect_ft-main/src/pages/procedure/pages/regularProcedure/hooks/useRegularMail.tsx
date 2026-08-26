import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type {
  MailGeneralNumeration,
  MessageSender,
  PaginationTable,
} from '@/types/types';
import {
  getMessageTypeFilterValue,
} from '@/utils/files/files.utils';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type {
  OutletProcedureContext,
  QueryProcedure,
} from '../../../interfaces/procedure.types';
import type {
  MailTypeProcedure,
  ReceptionMailNumeration,
} from '../../../models/types';

const getRegularMail = async (
  searchParams: URLSearchParams,
  office: number | null
) => {
  const requestParams = new URLSearchParams(searchParams);
  const typeMessage = getMessageTypeFilterValue(searchParams.get('typeMessage'));
  if (typeMessage) {
    requestParams.set('typeMessage', typeMessage);
  } else {
    requestParams.delete('typeMessage');
  }
  requestParams.set('category', 'DIRECT');
  const isReception = requestParams.get('type') === 'RECEPTION';
  if (office && !isReception) {
    requestParams.set('officeId', String(office));
  } else {
    requestParams.delete('officeId');
  }

  if (isReception) {
    const { data } = await axiosInstance.get<ReceptionMailNumeration>(
      'mail/holding',
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
    const { data } = await axiosInstance.get<MailGeneralNumeration>('mail', {
      params: requestParams,
      headers: {
        noLoader: true,
      },
    });
    const { mailList, total } = data;
    const transformMail = mailList.map(({ message }) => message);
    return { total, listMessage: transformMail };
  }
};

const useRegularMail = () => {
  const [searchParams, setSearchParams] = useSearchParams({
    type: 'RECEIVER',
    limit: '50',
    page: '0',
    category: 'DIRECT',
  });
  const { officeId: office } = useOutletContext<OutletProcedureContext>();

  const typeMail = (searchParams.get('type') ?? '') as MailTypeProcedure;
  const status = searchParams.get('status') ?? '';
  const typeMessage = searchParams.get('typeMessage') ?? '';
  const onHolding = searchParams.get('onHolding') ?? '';

  const regularMailQuery = useQuery({
    queryKey: ['regularMail', searchParams.toString(), office],
    queryFn: () => getRegularMail(searchParams, office),
  });

  const handleSelectOption = (option: MessageSender) => {
    const keyParam = option === 'ARCHIVER' ? 'status' : 'type';
    const value = option === 'ARCHIVER' ? 'ARCHIVADO' : option;
    const params = {
      limit: '50',
      page: '0',
      category: 'DIRECT',
      [keyParam]: value,
    };
    if (option === 'RECEPTION') params.onHolding = 'true';
    setSearchParams(params);
  };

  const getMessagesPagination = async ({
    pageIndex,
    pageSize,
  }: PaginationTable) => {
    searchParams.set('page', String(pageIndex));
    searchParams.set('limit', String(pageSize));
    setSearchParams(searchParams);
  };

  const query: QueryProcedure = {
    onHolding,
    office,
    status,
    typeMessage,
    typeMail,
  };
  return {
    regularMailQuery,
    handleSelectOption,
    getMessagesPagination,
    searchParams,
    query,
  };
};

export default useRegularMail;
