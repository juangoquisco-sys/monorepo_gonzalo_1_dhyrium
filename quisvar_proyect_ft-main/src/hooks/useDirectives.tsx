import type { GeneralFile } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { useQuery } from '@tanstack/react-query';

const getGeneralFiles = async () => {
  const res = await axiosInstance.get<GeneralFile[]>('/files/generalFiles', {
    headers: {
      noLoader: true,
    },
  });
  return res.data;
};
const useDirectives = () => {
  const directivesQuery = useQuery({
    queryKey: ['generalFiles'],
    queryFn: getGeneralFiles,
  });
  return directivesQuery;
};

export default useDirectives;
