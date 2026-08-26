import { useQuery } from '@tanstack/react-query';
import { TypePayroll } from '../../interface/payroll.types';
import type { PayrollDetail } from '../../interface/payroll.types';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const usePayroll = (salaryId: number) => {
  const { axiosAbortable, abortRequest } = useAbortableAxios();
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    return () => {
      abortRequest();
    };
  }, []);
  const typePayroll = (searchParams.get('typePayroll') ??
    TypePayroll.UNAPPROVED) as TypePayroll;

  const getPayroll = async (salaryId: number, typePayroll: TypePayroll) => {
    if (!salaryId) return;

    let params: undefined | URLSearchParams = new URLSearchParams({
      isAuthorizedGrop: 'false',
    });
    if (typePayroll === TypePayroll.APPROVED) {
      params = new URLSearchParams({
        isAuthorizedGrop: 'true',
        paymentGroup: 'false',
      });
    }
    if (typePayroll === TypePayroll.UNPAID) {
      params = new URLSearchParams({ paymentGroup: 'true' });
    }
    const res = await axiosAbortable.get<PayrollDetail>(
      `/payrolls/${salaryId}`,
      {
        params,
        headers: {
          noLoader: true,
        },
      }
    );

    return res.data;
  };

  const setSearchTypePayroll = (type: TypePayroll) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    type
      ? nextSearchParams.set('typePayroll', type)
      : nextSearchParams.delete('typePayroll');
    setSearchParams(nextSearchParams);
  };
  const payrollQuery = useQuery({
    queryKey: ['payroll', salaryId, typePayroll],
    queryFn: () => getPayroll(salaryId, typePayroll),
    enabled: Boolean(salaryId),
  });

  return {
    payrollQuery,
    salary: payrollQuery.data,
    typePayroll,
    setSearchTypePayroll,
  };
};

export default usePayroll;
