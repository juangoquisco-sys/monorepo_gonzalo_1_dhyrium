import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useEffect, useRef } from 'react';
import AlertConfirm from '@/components/alertConfirm/AlertConfirm';
import AlertNotification from '@/components/alertNotification/AlertNotification';
import ButtonDelete from '@/components/button/ButtonDelete';
import ConfirmAction from '@/components/confirmAction/ConfirmAction';
import ErrorBoundary from '@/components/errorBoundary/ErrorBoundary';
import Sidebar from '@/components/sidebar/Sidebar';
import ViewHtmlToPdf from '@/components/viewHtmlToPdf/ViewHtmlToPdfHost';
import ViewPdf from '@/components/viewPdf/ViewPdfHost';
import { errorToken$, toggle$ } from '@/services/sharingSubject';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store.types';
import { SocketProvider } from '@/context/SocketContex';
import { Subscription } from 'rxjs';
import './protecdRoute.css';
import {
  getAllServices,
  resetInitServicesCache,
} from '@/store/thunks/getAllInitServices..thunks';
import RouteLazyFallback from '@/routes/RouteLazyFallback';
import {
  isBackendUnavailable,
  isConnectivityError,
} from '@/services/connectivity';
import { useConnectivity } from '@/hooks/useConnectivity';
import { ConnectivityBlocker } from '@/components/connectivity/ConnectivityBlocker';

export const ProtectedRoute = () => {
  const location = useLocation();
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const isLogged = localStorage.getItem('token');
  const clossToggle = () => (toggle$.setSubject = false);
  const connectivity = useConnectivity();
  const backendUnavailable = isBackendUnavailable(connectivity);

  useEffect(() => {
    if (!isLogged || backendUnavailable) return;
    dispatch(getAllServices()).catch((error: unknown) => {
      if (isConnectivityError(error)) return;

      localStorage.removeItem('token');
      localStorage.removeItem('arrChecked');
      resetInitServicesCache();
      navigate('/login', { replace: true });
    });
  }, [backendUnavailable, dispatch, isLogged, navigate]);

  const handleErrorToken = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleErrorToken.current = errorToken$.getSubject.subscribe(() =>
      navigate('login')
    );
    return () => {
      handleErrorToken.current.unsubscribe();
    };
  }, [navigate]);

  if (!isLogged) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <SocketProvider>
      <div className="app-container">
        <Sidebar />
        <div className="main-container" onClick={clossToggle}>
          {/* <Snowflakes /> */}
          {!backendUnavailable && (
            <ErrorBoundary>
              <Suspense fallback={<RouteLazyFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
        <AlertNotification />
        <AlertConfirm />
        <ButtonDelete notIsVisible />
        <ViewPdf />
        <ViewHtmlToPdf />
        <ConfirmAction />
        {backendUnavailable && <ConnectivityBlocker />}
      </div>
    </SocketProvider>
  );
};
