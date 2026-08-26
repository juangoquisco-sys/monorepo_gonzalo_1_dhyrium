import type { UseQueryResult } from '@tanstack/react-query';
import { createContext } from 'react';
import type { PayrollDetail, TypePayroll } from '../../interface/payroll.types';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';

interface PayrollContextProps {
  payrollQuery: UseQueryResult<PayrollDetail | undefined, Error>;
  salaryId: number;
  salary: PayrollDetail | undefined;
  setSearchTypePayroll: (type: TypePayroll) => void;
  typePayroll: TypePayroll;
  handleRowSelection: OnChangeFn<RowSelectionState>;
  rowSelection: RowSelectionState;
}

export const PayrollContext = createContext({} as PayrollContextProps);
