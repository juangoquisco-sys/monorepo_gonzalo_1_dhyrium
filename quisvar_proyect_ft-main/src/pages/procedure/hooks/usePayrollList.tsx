import { axiosInstance } from '@/services/axiosInstance';
import { useQuery } from '@tanstack/react-query';
import type { Payroll } from '../interfaces/procedure.types';
import { useMemo, useState } from 'react';

interface usePayrollListProps {
  status?: boolean;
}
const getPayroll = async (params: usePayrollListProps): Promise<Payroll[]> => {
  const { data } = await axiosInstance.get<Payroll[]>('/payrolls', {
    params,
    headers: {
      noLoader: true,
    },
  });

  return data;
};

const usePayrollList = (params: usePayrollListProps) => {
  const [newSalary, setNewSalary] = useState(false);

  const usePayrollListQuery = useQuery({
    queryKey: ['usePayrollList', params],
    queryFn: () => getPayroll(params),
  });
  const latestPayroll = useMemo(() => {
    return usePayrollListQuery?.data
      ? usePayrollListQuery.data.reduce((latest: Payroll, record) => {
          return new Date(record.createdAt) > new Date(latest.createdAt)
            ? record
            : latest;
        }, usePayrollListQuery.data[0])
      : undefined;
  }, [usePayrollListQuery.data]);

  const handleFinish = () => {
    handleNewSalary();
    usePayrollListQuery.refetch();
  };

  const handleNewSalary = () => {
    setNewSalary(!newSalary);
  };
  return {
    usePayrollListQuery,
    handleFinish,
    handleNewSalary,
    newSalary,
    newPad: (latestPayroll?.pad ?? 0) + 1,
    latestPayroll,
  };
};

export default usePayrollList;
