import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { SpecialtiesSelect } from '@/pages/userCenter/models/specialtyOption.types';

const getSpecialties = async () => {
  const res = await axiosInstance.get<SpecialtiesSelect[]>(`/listSpecialties`, {
    headers: {
      noLoader: true,
    },
  });
  return res.data;
};
const useSpecialtiesSelect = () => {
  const specialtiesSelectQuery = useQuery({
    queryKey: ['specialtiesSelect'],
    queryFn: getSpecialties,
  });
  return { specialtiesSelectQuery };
};

export default useSpecialtiesSelect;
