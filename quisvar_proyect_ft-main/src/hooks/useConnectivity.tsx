import { useSyncExternalStore } from 'react';
import {
  getConnectivitySnapshot,
  subscribeConnectivity,
} from '@/services/connectivity';

export const useConnectivity = () =>
  useSyncExternalStore(
    subscribeConnectivity,
    getConnectivitySnapshot,
    getConnectivitySnapshot
  );
