import { useCallback, useRef } from 'react';
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { axiosInstance } from '@/services/axiosInstance';

const useAbortableAxios = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortRequest = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const makeRequest = useCallback(async <T,>(config: AxiosRequestConfig) => {
    abortControllerRef.current = new AbortController();

    try {
      const response: AxiosResponse<T> = await axiosInstance({
        ...config,
        signal: abortControllerRef.current.signal,
      });

      return response;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request was canceled');
      } else {
        throw error;
      }
    }
  }, []);

  const get = useCallback(
    <T,>(url: string, config?: AxiosRequestConfig) => {
      return makeRequest<T>({ ...config, url, method: 'GET' });
    },
    [makeRequest]
  );

  const post = useCallback(
    <T,>(url: string, data?: any, config?: AxiosRequestConfig) => {
      return makeRequest<T>({ ...config, url, method: 'POST', data });
    },
    [makeRequest]
  );

  const put = useCallback(
    <T,>(url: string, data?: any, config?: AxiosRequestConfig) => {
      return makeRequest<T>({ ...config, url, method: 'PUT', data });
    },
    [makeRequest]
  );

  const patch = useCallback(
    <T,>(url: string, data?: any, config?: AxiosRequestConfig) => {
      return makeRequest<T>({ ...config, url, method: 'PATCH', data });
    },
    [makeRequest]
  );

  const del = useCallback(
    <T,>(url: string, config?: AxiosRequestConfig) => {
      return makeRequest<T>({ ...config, url, method: 'DELETE' });
    },
    [makeRequest]
  );

  return {
    axiosAbortable: {
      get,
      post,
      put,
      patch,
      del,
    },
    abortRequest,
  };
};

export default useAbortableAxios;
