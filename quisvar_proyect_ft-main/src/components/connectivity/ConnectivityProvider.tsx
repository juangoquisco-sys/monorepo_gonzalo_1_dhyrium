import { type ReactNode, useEffect, useRef } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useConnectivity } from '@/hooks/useConnectivity';
import {
  checkBackendHealth,
  isBackendUnavailable,
  isHttpReachable,
} from '@/services/connectivity';

interface ConnectivityProviderProps {
  children: ReactNode;
}

export const ConnectivityProvider = ({
  children,
}: ConnectivityProviderProps) => {
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const backendUnavailable = isBackendUnavailable(connectivity);
  const wasHttpReachableRef = useRef(isHttpReachable(connectivity));

  useEffect(() => {
    const handleFocus = () => {
      void checkBackendHealth();
    };

    window.addEventListener('focus', handleFocus);

    void checkBackendHealth();

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!backendUnavailable) return;

    const interval = window.setInterval(() => {
      void checkBackendHealth();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [backendUnavailable]);

  useEffect(() => {
    const httpReachable = isHttpReachable(connectivity);
    onlineManager.setOnline(httpReachable);

    if (!wasHttpReachableRef.current && httpReachable) {
      void queryClient.resumePausedMutations();
      void queryClient.refetchQueries({ type: 'active' });
    }

    wasHttpReachableRef.current = httpReachable;
  }, [connectivity, queryClient]);

  return <>{children}</>;
};
