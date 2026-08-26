import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type {
  OfficeUsers,
  OfficeUsersSelect,
} from '../interface/taskForReview.types';

const getListOfficeUser = async (): Promise<OfficeUsersSelect[]> => {
  const { data } = await axiosInstance.get<OfficeUsers[]>('/division/users', {
    headers: {
      noLoader: true,
    },
  });
  const optionSelect = data.map(office => ({
    ...office,
    value: String(office.id),
    label: office.officeName,
  }));
  return optionSelect;
};

const useListOfficeUser = () => {
  const listOfficeUser = useQuery({
    queryKey: ['listOfficeUser'],
    queryFn: getListOfficeUser,
  });
  return { listOfficeUser };
};

export default useListOfficeUser;
