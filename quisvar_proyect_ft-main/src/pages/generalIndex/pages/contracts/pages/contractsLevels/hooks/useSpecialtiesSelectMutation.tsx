import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { ContractSpecialties } from '../../../models/type.contracts';
const addSpecialties = async (body: {
  listSpecialtiesId: number;
  contratcId: number;
}) => {
  const { data } = await axiosInstance.post('/contract/specialties', body, {
    headers: {
      noLoader: true,
    },
  });
  return data;
};
const useSpecialtiesSelectMutation = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addSpecialties,
    onSuccess: (newData: ContractSpecialties) => {
      queryClient.setQueryData<ContractSpecialties[]>(
        ['listProfessional', newData.contratcId],
        oldData => {
          if (!oldData) return [newData];
          return [...oldData, newData];
        }
      );
    },
  });
  return mutation;
};

export default useSpecialtiesSelectMutation;
