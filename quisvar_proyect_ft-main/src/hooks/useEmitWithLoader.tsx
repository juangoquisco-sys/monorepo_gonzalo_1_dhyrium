import { useCallback, useContext } from 'react';
import { loader$ } from '@/services/sharingSubject';
import { SocketContext } from '@/context/SocketContex';

const useEmitWithLoader = () => {
  const socket = useContext(SocketContext);

  const emitWithLoader = useCallback(
    <T extends { error: boolean }, A extends any[]>(
      event: string,
      ...args: A
    ) => {
      return new Promise((resolve, reject) => {
        loader$.setSubject = true;
        const callback = (response: T) => {
          loader$.setSubject = false;
          if (response?.error) {
            reject('Error');
          } else {
            resolve(response);
          }
        };
        try {
          socket.emit(event, ...args, callback);
        } catch (error) {
          loader$.setSubject = false;
          reject(error);
        }
      });
    },
    [socket]
  );
  return { emitWithLoader, socket };
};

export default useEmitWithLoader;
