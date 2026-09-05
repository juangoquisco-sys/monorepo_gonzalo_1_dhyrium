import { Outlet, useLocation } from 'react-router-dom';
import './procedure.css';
import useSubMenus from '@/hooks/useSubMenus';
import Navbar from '@/components/navbar/Navbar';
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
  const { subMenu } = useSubMenus();

  const values: OutletProcedureContext = {
    officeId,
  };

  return (
    <div className="procedure">
      {!isPayrollRoute && (
        <Navbar
          subMenu={subMenu.filter(
            item => String(item.route) !== 'salidas' || item.typeRol === 'USER'
          )}
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
