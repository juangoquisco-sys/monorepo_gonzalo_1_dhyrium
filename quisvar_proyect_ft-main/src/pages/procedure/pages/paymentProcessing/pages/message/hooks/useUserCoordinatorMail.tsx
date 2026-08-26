import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { MessageCardContext } from '../components/messageCard/MessageCard';
import { axiosInstance } from '@/services/axiosInstance';

const getCoordinatorMail = async (userInitId: number) => {
  const res = await axiosInstance.get<{ dni: string; fullname: string }[]>(
    `/groups/owner/${userInitId}`,
    {
      headers: {
        noLoader: true,
      },
    }
  );
  return res.data.length > 0 ? res.data[0] : { dni: '---', fullname: '---' };
};
const useUserCoordinatorMail = () => {
  const { message } = useContext(MessageCardContext);
  const userCoordinatorMailQuery = useQuery({
    queryKey: ['userCoordinatorMail', message?.id],
    queryFn: () => getCoordinatorMail(message?.userInit.userId),
  });
  return { userCoordinatorMailQuery };
};

export default useUserCoordinatorMail;
