import { NavLink, useLocation } from 'react-router-dom';
import type { MenuItem } from '@/types/types';
import { preloadRouteChunk } from '@/routes/routePreloaders';

interface ChipItemProps {
  item: MenuItem;
  offsetTop?: number;
}

const ChipItem = ({ item, offsetTop = 0 }: ChipItemProps) => {
  const location = useLocation();
  const preloadChunk = () => preloadRouteChunk(item.route);
  const routePath = item.path || item.route;
  const isPayrollPath =
    location.pathname.startsWith('/planilla') ||
    location.pathname.startsWith('/tramites/tramite-de-pago/planilla');

  return (
    <li>
      <NavLink
        to={routePath}
        onFocus={preloadChunk}
        onMouseDown={preloadChunk}
        onMouseEnter={preloadChunk}
        onTouchStart={preloadChunk}
        className={({ isActive }) => {
          const isPayrollItem = item.route === 'planilla';
          const isProcedureItem = item.route === 'tramites';
          const shouldBeActive =
            (isPayrollItem && isPayrollPath) ||
            (isProcedureItem && isActive && !isPayrollPath) ||
            (!isPayrollItem && !isProcedureItem && isActive);

          return shouldBeActive ? 'item-nav nav-active' : 'item-nav';
        }}
      >
        <span className="items-list-icon">
          <img src={`/svg/menu/${item.route}.svg`} alt={item.title} />
          <p
            className="items-list-name"
            style={{ transform: `translateY(-${offsetTop}px)` }}
          >
            {item.title}
          </p>
        </span>
      </NavLink>
    </li>
  );
};

export default ChipItem;
