import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { PayrollDetail } from '../../interface/payroll.types';
import { useContext } from 'react';
import { PayrollContext } from '../context/payrollContext';
import axios from 'axios';
import type { CancelTokenSource } from 'axios';

interface CheckProps {
  reportsId: number[];
  isAuthorized: boolean;
}
let cancelTokenSource: CancelTokenSource;
const handleCheck = async ({ isAuthorized, reportsId }: CheckProps) => {
  if (cancelTokenSource) {
    cancelTokenSource.cancel(
      'Operación cancelada debido a una nueva solicitud.'
    );
  }
  cancelTokenSource = axios.CancelToken.source();
  const body = {
    isAuthorized,
    ids: reportsId.map(id => ({ id })),
  };

  await axiosInstance.put(`/payrolls/step-authorized-items`, body, {
    headers: {
      noLoader: true,
    },
    cancelToken: cancelTokenSource.token,
  });
};
const useReportAuthorizedMutation = () => {
  const { typePayroll, salaryId } = useContext(PayrollContext);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: handleCheck,
    onMutate: async () => {
      // const queryKey = ['payroll', salaryId, typePayroll];
      // await queryClient.cancelQueries({ queryKey });
      const prevData = queryClient.getQueryData<PayrollDetail>([
        'payroll',
        salaryId,
        typePayroll,
      ]);
      // queryClient.setQueryData<PayrollDetail>(
      //   ['payroll', salaryId, typePayroll],
      //   oldData => {
      //     if (oldData) {
      //       const newOffices = oldData.offices.map(office => {
      //         const newPayrolls = office.payrolls.map(payroll => {
      //           const newReports = payroll.reports.map(report =>
      //             report.id === +reportId ? { ...report, isAuthorized } : report
      //           );
      //           return { ...payroll, reports: newReports };
      //         });
      //         return { ...office, payrolls: newPayrolls };
      //       });
      //       return { ...oldData, offices: newOffices };
      //     }
      //   }
      // );

      return { prevData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payroll', salaryId, typePayroll],
      });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        ['payroll', salaryId, typePayroll],
        context?.prevData
      );
    },
  });
  return mutation;
};

export default useReportAuthorizedMutation;
