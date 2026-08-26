import { useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import { setSocketStatus } from '@/services/connectivity';
import { API_ORIGIN } from '@/config/runtimeUrls';

const useSocket = () => {
  const token = localStorage.getItem('token') || '';
  const urlObj = new URL(API_ORIGIN);
  const origin = urlObj.origin;
  const basePath = urlObj.pathname.length === 1 ? '' : urlObj.pathname;
  const socket = useMemo(
    () =>
      io(origin, {
        path: `${basePath}/socket.io`,
        extraHeaders: {
          authorization: `bearer ${token}`,
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
        timeout: 10000,
      }),
    [basePath, origin, token]
  );

  useEffect(() => {
    const handleConnect = () => setSocketStatus('connected');
    const handleDisconnect = () => setSocketStatus('disconnected');
    const handleConnectError = () => setSocketStatus('disconnected');
    const handleReconnectAttempt = () => setSocketStatus('connecting');

    setSocketStatus(socket.connected ? 'connected' : 'connecting');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.disconnect();
      setSocketStatus('unknown');
    };
  }, [socket]);

  return socket;
};

export default useSocket;
