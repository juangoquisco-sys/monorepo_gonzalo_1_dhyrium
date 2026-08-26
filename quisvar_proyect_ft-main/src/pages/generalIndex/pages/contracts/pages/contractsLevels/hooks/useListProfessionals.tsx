import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { ContractSpecialties } from '../../../models/type.contracts';

const getContractSpecialties = async (contractId: number) => {
  const res = await axiosInstance.get<ContractSpecialties[]>(
    `/contract/${contractId}/specialties`,
    {
      headers: {
        noLoader: true,
      },
    }
  );
  return res.data;
};
const useListProfessionals = (contractId: number) => {
  // const [menuIsOpen, setMenuIsOpen] = useState(false);

  // // Función para manejar el scroll y cerrar el menú
  // const handleScroll = () => {
  //   console.log("asdasdsad")
  //   if (menuIsOpen) {
  //     setMenuIsOpen(false);
  //   }
  // };

  // // Agregar y eliminar el evento de scroll
  // useEffect(() => {
  //   window.addEventListener('scroll', handleScroll);
  //   return () => {
  //     window.removeEventListener('scroll', handleScroll);
  //   };
  // }, [menuIsOpen]);

  const listProfessionalQuery = useQuery({
    queryKey: ['listProfessional', contractId],
    queryFn: () => getContractSpecialties(contractId),
  });
  return { listProfessionalQuery };
};

export default useListProfessionals;
