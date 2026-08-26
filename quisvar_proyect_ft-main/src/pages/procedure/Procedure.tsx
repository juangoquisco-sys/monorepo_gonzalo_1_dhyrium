import { Outlet, useLocation } from 'react-router-dom';
import './procedure.css';
import useSubMenus from '@/hooks/useSubMenus';
import Navbar, {
  type NavbarTopMenuItem,
} from '@/components/navbar/Navbar';
import ProcedureSelectOffice from './components/procedureSelectOffice/ProcedureSelectOffice';
import { useState } from 'react';
import type { OutletProcedureContext } from './interfaces/procedure.types';

const Procedure = () => {
  const localOfficeId = localStorage.getItem('officeId');
  const location = useLocation();
  const isPayrollRoute = location.pathname.startsWith(
    '/tramites/tramite-de-pago/planilla'
  );

  const [officeId, setofficeId] = useState<number | null>(
    localOfficeId ? +localOfficeId : null
  );
  const [entity, setEntity] = useState('DHYRIUM');
  const { subMenu } = useSubMenus();

  const entityMenuItems: NavbarTopMenuItem[] = [
    { id: 'dhyrium', label: 'DHYRIUM', isActive: entity === 'DHYRIUM', onClick: () => setEntity('DHYRIUM') },
    { id: 'empresas', label: 'EMPRESAS', isActive: entity === 'EMPRESAS', onClick: () => setEntity('EMPRESAS') },
    { id: 'consorcios', label: 'CONSORCIOS', isActive: entity === 'CONSORCIOS', onClick: () => setEntity('CONSORCIOS') },
  ];

  const values: OutletProcedureContext = {
    officeId,
  };

  return (
    <div className="procedure">
      {!isPayrollRoute && (
        <Navbar
          title="tramites&nbsp;de usuario"
          subMenu={subMenu}
          topMenuItems={entityMenuItems}
          component={
            <ProcedureSelectOffice officeId={officeId} onChange={setofficeId} />
          }
        />
      )}
      <div className="procedure-main">
        <Outlet context={values} />
      </div>
    </div>
  );
};

export default Procedure;
