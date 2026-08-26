import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { Periods, PeriodsSelect } from '@/types/types';

const getPeriods = async (): Promise<PeriodsSelect[]> => {
  const { data } = await axiosInstance.get<Periods[]>('/phases', {
    headers: {
      noLoader: true,
    },
  });
  const optionSelect = data.map(period => ({
    ...period,
    value: String(period.id),
    label: period.name,
  }));

  return optionSelect;
};

const useListPeriod = () => {
  const useListPeriodQuery = useQuery({
    queryKey: ['useListPeriod'],
    queryFn: getPeriods,
  });
  return { useListPeriodQuery };
};

export default useListPeriod;
