import { createContext } from 'react';

interface PersonalReportContextProps {
  noViewSidebar: boolean;
  editValues: boolean;
  navigatePayroll: boolean;
  noViewButtonBack: boolean;
  noViewActionsRow: boolean;
  technicalEvidence: boolean;
}
export const PersonalReportContext = createContext(
  {} as PersonalReportContextProps
);
