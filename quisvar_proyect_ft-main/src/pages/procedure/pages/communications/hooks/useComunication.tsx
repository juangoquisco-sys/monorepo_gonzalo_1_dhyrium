import { useSearchParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import type { MailGeneralNumeration, PaginationTable } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import {
  getMessageTypeFilterValue,
} from '@/utils/files/files.utils';

const getComunicationMail = async (searchParams: URLSearchParams) => {
  const requestParams = new URLSearchParams(searchParams);
  const typeMessage = getMessageTypeFilterValue(searchParams.get('typeMessage'));
  if (typeMessage) {
    requestParams.set('typeMessage', typeMessage);
  } else {
    requestParams.delete('typeMessage');
  }
  requestParams.set('category', 'GLOBAL');
  const { data } = await axiosInstance.get<MailGeneralNumeration>('mail', {
    params: requestParams,
    headers: {
      noLoader: true,
    },
  });
  const { mailList, total } = data;
  const transformMail = mailList.map(({ message }) => message);
  return { total, listMessage: transformMail };
};

const useComunication = () => {
  const [searchParams, setSearchParams] = useSearchParams({
    limit: '50',
    page: '0',
    category: 'GLOBAL',
  });
  const typeMessage = searchParams.get('typeMessage') ?? '';

  const comunicationQuery = useQuery({
    queryKey: ['comunication', searchParams.toString()],
    queryFn: () => getComunicationMail(searchParams),
  });

  const handleFilter = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = target;
    value ? searchParams.set(name, value) : searchParams.delete(name);
    searchParams.set('category', 'GLOBAL');
    setSearchParams(searchParams);
  };
  const getMessagesPagination = async ({
    pageIndex,
    pageSize,
  }: PaginationTable) => {
    searchParams.set('page', String(pageIndex));
    searchParams.set('limit', String(pageSize));
    searchParams.set('category', 'GLOBAL');
    setSearchParams(searchParams);
  };
  return {
    comunicationQuery,
    getMessagesPagination,
    handleFilter,
    typeMessage,
  };
};

export default useComunication;
