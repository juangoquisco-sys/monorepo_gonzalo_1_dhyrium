import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/Navbar';
import type { SubMenu } from '@/types/types';
import './benefits.css';

const BENEFITS_SUB_MENU: SubMenu[] = [
  { id: 'alojamiento', route: 'alojamiento', title: 'Alojamiento' },
  { id: 'comida', route: 'comida', title: 'Comida' },
];

const BenefitsLayout = () => (
  <div className="benefits min-h-screen bg-muted/70">
    <Navbar subMenu={BENEFITS_SUB_MENU} />
    <main className="h-[calc(100vh-var(--navbar-height))] overflow-y-auto">
      <Outlet />
    </main>
  </div>
);

export default BenefitsLayout;
