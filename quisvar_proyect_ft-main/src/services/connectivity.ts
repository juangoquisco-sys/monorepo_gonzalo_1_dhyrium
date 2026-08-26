import { CONNECTIVITY_MESSAGES } from '@/components/connectivity/connectivityMessages';
import { API_BASE_URL } from '@/config/runtimeUrls';

type BackendStatus = 'unknown' | 'checking' | 'available' | 'unavailable';
type SocketStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected';
type ConnectivityIssueType = 'backend' | 'socket';

export interface ConnectivityState {
  backendStatus: BackendStatus;
  socketStatus: SocketStatus;
}

export interface ConnectivityIssue {
  type: ConnectivityIssueType;
  title: string;
  message: string;
}

const HEALTH_URL = `${API_BASE_URL}/health`;
const HEALTH_TIMEOUT_MS = 4000;

let state: ConnectivityState = {
  backendStatus: 'unknown',
  socketStatus: 'unknown',
};

let healthCheckInFlight: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach(listener => listener());
};

export const getConnectivitySnapshot = () => state;

export const subscribeConnectivity = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const updateConnectivityState = (patch: Partial<ConnectivityState>) => {
  state = { ...state, ...patch };
  notify();
};

export const setSocketStatus = (socketStatus: SocketStatus) => {
  updateConnectivityState({ socketStatus });
};

export const isBackendUnavailable = (snapshot = state) =>
  snapshot.backendStatus === 'unavailable';

export const isHttpReachable = (snapshot = state) =>
  !isBackendUnavailable(snapshot);

export const getConnectivityIssue = (
  snapshot = state
): ConnectivityIssue | null => {
  if (isBackendUnavailable(snapshot)) {
    return {
      type: 'backend',
      title: CONNECTIVITY_MESSAGES.backendUnavailable.title,
      message: CONNECTIVITY_MESSAGES.backendUnavailable.message,
    };
  }

  if (
    snapshot.backendStatus === 'available' &&
    snapshot.socketStatus === 'disconnected'
  ) {
    return {
      type: 'socket',
      title: CONNECTIVITY_MESSAGES.socketDisconnected.title,
      message: CONNECTIVITY_MESSAGES.socketDisconnected.message,
    };
  }

  return null;
};

export const isConnectivityError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as {
    code?: string;
    isAxiosError?: boolean;
    message?: string;
    response?: unknown;
  };

  if (maybeError.code === 'ERR_CANCELED') return false;

  if (maybeError.isAxiosError) {
    return !maybeError.response;
  }

  return (
    error instanceof TypeError &&
    /failed to fetch|network|load failed/i.test(maybeError.message || '')
  );
};

export const reportConnectivityError = (error: unknown) => {
  if (!isConnectivityError(error)) return;

  updateConnectivityState({
    backendStatus: 'unavailable',
  });
  void checkBackendHealth();
};

export const checkBackendHealth = async () => {
  if (healthCheckInFlight) return healthCheckInFlight;

  updateConnectivityState({
    backendStatus:
      state.backendStatus === 'unknown' ? 'checking' : state.backendStatus,
  });

  healthCheckInFlight = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      HEALTH_TIMEOUT_MS
    );

    try {
      const response = await fetch(HEALTH_URL, {
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        signal: controller.signal,
      });

      const isAvailable = response.ok;
      updateConnectivityState({
        backendStatus: isAvailable ? 'available' : 'unavailable',
      });
      return isAvailable;
    } catch {
      updateConnectivityState({
        backendStatus: 'unavailable',
      });
      return false;
    } finally {
      window.clearTimeout(timeout);
      healthCheckInFlight = null;
    }
  })();

  return healthCheckInFlight;
};
