import { useEffect, useRef } from 'react';
import { URL, axiosInstance } from '@/services/axiosInstance';
type TypeArchiver = 'projects' | 'levels' | 'stages';
type TypeZip = 'projects' | 'editables' | 'pdfs';

interface Archiver {
  result: string;
  urlFile: string;
  urlFileDelete: string;
}

const useArchiver = (
  id: number,
  type: TypeArchiver,
  nameZip: string,
  typeZip: TypeZip = 'projects'
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  const handleArchiver = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    axiosInstance
      .get<Archiver>(
        `/archiver/${id}?type=${type}&nameZip=${nameZip}&typeZip=${typeZip}`
      )
      .then(({ data }) => {
        window.location.href = `${URL}/${data.urlFile}`;
        timeoutRef.current = setTimeout(() => {
          axiosInstance.delete(`/archiver/?path=${data.urlFileDelete}`);
        }, 3000);
      });
  };
  return { handleArchiver };
};

export default useArchiver;
