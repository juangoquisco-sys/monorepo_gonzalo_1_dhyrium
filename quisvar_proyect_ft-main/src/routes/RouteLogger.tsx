import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackRouteChange } from '@/lib/frontendLogger';

const RouteLogger = () => {
  const location = useLocation();

  useEffect(() => {
    trackRouteChange(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search]);

  return null;
};

export default RouteLogger;
