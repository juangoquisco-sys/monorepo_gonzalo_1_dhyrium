import { useRef, useState } from 'react';
import { checkBackendHealth } from '@/services/connectivity';

export const useConnectivityRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const retryInFlightRef = useRef(false);

  const retryConnection = async () => {
    if (retryInFlightRef.current) return;

    retryInFlightRef.current = true;
    setIsRetrying(true);
    try {
      await checkBackendHealth();
    } finally {
      retryInFlightRef.current = false;
      setIsRetrying(false);
    }
  };

  return {
    isRetrying,
    retryConnection,
  };
};
