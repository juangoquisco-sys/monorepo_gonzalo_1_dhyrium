import { axiosInstance } from '@/services/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CompaniesSelect } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface DataCompany {
  color: string;
  phone: string;
  email: string;
  idCompany: number;
  // signal: AbortSignal;
}
const editInvoiceCompany = async ({
  color = '',
  idCompany,
  email = '',
  phone = '',
}: DataCompany) => {
  const body = {
    color,
    email,
    phone,
  };
  const res = await axiosInstance.put(`/companies/${idCompany}/invoice`, body, {
    headers: {
      noLoader: true,
    },
  });
  return res.data;
};

const useInvoiceCompany = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: editInvoiceCompany,
    onMutate: data => {
      const { color, idCompany, email, phone } = data;
      const prevData = queryClient.getQueryData<CompaniesSelect[]>([
        'companySelect',
      ]);
      queryClient.setQueryData<CompaniesSelect[]>(
        ['companySelect'],
        oldData => {
          if (oldData) {
            const newData = oldData.map(el =>
              el.id === idCompany ? { ...el, color, email, phone } : el
            );
            return newData;
          }
        }
      );
      return { prevData };
    },

    onError: (error, _variables, context) => {
      queryClient.setQueryData(['companySelect'], context?.prevData);
      if (error.name !== 'CanceledError') {
        return SnackbarUtilities.error('Error al editar el color');
      }
    },
  });
  return mutation;
};

export default useInvoiceCompany;
