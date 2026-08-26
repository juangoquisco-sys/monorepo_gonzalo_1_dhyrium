import { axiosInstance } from '@/services/axiosInstance';
import type {
  SystemSocketUsersFilters,
  SystemSocketUsersResponse,
} from './systemSocketUsers.models';

const noLoaderHeaders = { headers: { noLoader: true } };

const cleanParams = (filters: SystemSocketUsersFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      return true;
    })
  );

export const getSystemSocketUsers = async (
  filters: SystemSocketUsersFilters
) => {
  const res = await axiosInstance.get<SystemSocketUsersResponse>(
    '/system/socket-users',
    {
      ...noLoaderHeaders,
      params: cleanParams(filters),
    }
  );
  return res.data;
};
