import { createContext, type ReactNode } from 'react';
import useSocket from '@/hooks/useSocket';
import type { Socket } from 'socket.io-client';

export const SocketContext = createContext<Socket>({} as Socket);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const socket = useSocket();

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
