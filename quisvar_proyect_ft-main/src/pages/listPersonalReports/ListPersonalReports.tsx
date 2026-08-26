import { Outlet, useLocation, useParams } from 'react-router-dom';
import './listPersonalReports.css';
import ListPersonalReportsSidebar from './Views/listPersonalReportsSidebar/ListPersonalReportsSidebar';
import { Fragment, useRef } from 'react';
import { PersonalReportContext } from './context/PersonalReportContext';
const ListPersonalReports = () => {
  const { state } = useLocation();
  const { reportId } = useParams();

  const noViewSidebar = useRef<boolean>(!!state?.noViewSidebar).current;
  const editValues = useRef<boolean>(!!state?.editValues).current;
  const navigatePayroll = useRef<boolean>(!!state?.navigatePayroll).current;
  const noViewButtonBack = useRef<boolean>(!!state?.noViewButtonBack).current;
  const noViewActionsRow = useRef<boolean>(!!state?.noViewActionsRow).current;
  const technicalEvidence = useRef<boolean>(!!state?.technicalEvidence).current;

  return (
    <PersonalReportContext.Provider
      value={{
        noViewSidebar,
        editValues,
        navigatePayroll,
        noViewButtonBack,
        noViewActionsRow,
        technicalEvidence,
      }}
    >
      <div className="listPersonalReports">
        {!noViewSidebar && <ListPersonalReportsSidebar />}
        {reportId && (
          <Fragment key={reportId}>
            <Outlet />
          </Fragment>
        )}
      </div>
    </PersonalReportContext.Provider>
  );
};

export default ListPersonalReports;
