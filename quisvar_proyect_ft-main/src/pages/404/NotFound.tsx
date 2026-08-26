import './notFound.css';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addBreadcrumb, captureMessage } from '@/lib/frontendLogger';

export const NotFound = () => {
  const navigation = useNavigate();
  const location = useLocation();

  const handleReturn = () => navigation('login');

  useEffect(() => {
    const fullRoute = `${location.pathname}${location.search}${location.hash}`;

    addBreadcrumb({
      type: 'navigation_404',
      message: `Ruta frontend no encontrada: ${fullRoute}`,
      route: fullRoute,
      data: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
    });

    captureMessage({
      type: 'FRONTEND_ROUTE_404',
      level: 'warning',
      message: `Ruta frontend no encontrada: ${fullRoute}`,
      context: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        fullRoute,
        referrer: document.referrer,
      },
    });
  }, [location.hash, location.pathname, location.search]);

  return (
    <div className="notFound">
      <figure className="notFound-figure">
        <img
          alt="cohete"
          src="/img/rocket.png"
          className="notFound-figure-img"
        />
      </figure>
      <div className="notFound-group">
        <label className="notFound-title">Ooops! - 404</label>
        <p className="notFound-paragraph">
          Lo sentimos, parece que no podemos encontrar lo
          <span className="notFound-span">que estás buscando.</span>Ha
          aterrizado en una URL que no parece existir.
        </p>
        <input
          type="button"
          onClick={handleReturn}
          value="VOLVER"
          className="notFound-btn"
        />
      </div>
      <div className="notFound-contain-logo">
        <img src="/img/quisvar_logo.png" alt="logo" />
      </div>
    </div>
  );
};

export default NotFound;
