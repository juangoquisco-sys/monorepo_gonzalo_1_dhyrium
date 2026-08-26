import { axiosInstance } from '@/services/axiosInstance';
import type { SystemHealthResponse } from './systemHealth.models';

const noLoaderHeaders = { headers: { noLoader: true } };

export const getSystemHealth = async () => {
  const res = await axiosInstance.get<SystemHealthResponse>(
    '/system/health',
    noLoaderHeaders
  );
  return res.data;
};
