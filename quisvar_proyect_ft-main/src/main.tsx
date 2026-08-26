import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SnackbarProvider } from 'notistack';
import { axiosInterceptor } from '@/services/axiosInstance';
import { Provider } from 'react-redux';
import store from '@/store/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { installFrontendLoggers } from '@/lib/installFrontendLoggers';
import { captureException } from '@/lib/frontendLogger';
import {
  getConnectivitySnapshot,
  isConnectivityError,
  isHttpReachable,
} from '@/services/connectivity';
import { ConnectivityProvider } from '@/components/connectivity/ConnectivityProvider';

installFrontendLoggers();
axiosInterceptor();

if (window.location.pathname !== '/' && !window.location.hash) {
  window.history.replaceState(
    null,
    '',
    `/#${window.location.pathname}${window.location.search}`
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'online',
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (isConnectivityError(error)) return false;
        if (!isHttpReachable(getConnectivitySnapshot())) return false;
        return failureCount < 1;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      networkMode: 'online',
      retry: false,
    },
  },
});
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

const root = ReactDOM.createRoot(container, {
  onCaughtError: (error, errorInfo) => {
    console.error('React caught error:', error, errorInfo);
  },
  onUncaughtError: (error, errorInfo) => {
    console.error('React uncaught error:', error, errorInfo);
    captureException({
      error,
      type: 'REACT_RENDER_ERROR',
      level: 'critical',
      componentStack: errorInfo.componentStack || undefined,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  },
  onRecoverableError: (error, errorInfo) => {
    console.warn('React recoverable error:', error, errorInfo);
    captureException({
      error,
      type: 'REACT_RENDER_ERROR',
      level: 'warning',
      componentStack: errorInfo.componentStack || undefined,
      context: {
        componentStack: errorInfo.componentStack,
        recoverable: true,
      },
    });
  },
});

root.render(
  // <React.StrictMode>
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <SnackbarProvider autoHideDuration={4000} maxSnack={3}>
          <AppErrorBoundary>
            <ConnectivityProvider>
              <App />
            </ConnectivityProvider>
          </AppErrorBoundary>
        </SnackbarProvider>
      </Provider>
    </QueryClientProvider>
  </ThemeProvider>

  // </React.StrictMode>
);
