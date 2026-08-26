import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import './navbar.css';
import NavbarButton from '../navbarButton/NavbarButton';
import type { SubMenu } from '@/types/types';

export interface NavbarTopMenuItem {
  id: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface NavbarProps {
  title?: string;
  subMenu?: SubMenu[];
  component?: ReactNode;
  topMenuItems?: NavbarTopMenuItem[];
}

const Navbar = ({
  title = 'Default Title',
  subMenu = [],
  component,
  topMenuItems = [],
}: NavbarProps) => {
  return (
    <div
      className={`navbar-header ${
        topMenuItems.length ? 'navbar-header-with-top-menus' : ''
      }`}
    >
      {topMenuItems.length > 0 && (
        <div className="navbar-header-top-menus" role="tablist" aria-label="Entidad de trabajo">
          {topMenuItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`navbar-top-menu${item.isActive ? ' navbar-top-menu-active' : ''}`}
              role="tab"
              aria-selected={item.isActive ?? false}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <p className="navbar-title">{title}</p>
      <div className="navbar-header-menus">
        {subMenu.map(header => (
          <NavLink key={header.id} to={header.route}>
            {({ isActive }) => (
              <NavbarButton isActive={isActive} text={header.title} />
            )}
          </NavLink>
        ))}
      </div>
      {component}
    </div>
  );
};

export default Navbar;
