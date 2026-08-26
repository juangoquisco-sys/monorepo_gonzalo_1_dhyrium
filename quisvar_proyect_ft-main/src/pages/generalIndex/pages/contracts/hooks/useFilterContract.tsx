import { useMemo, useState, type ChangeEvent } from 'react';
import type { Contract } from '@/types/types';

const useFilterContract = (contract: Contract[] | null) => {
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const newfilterContract = useMemo(() => {
    if (!contract) return [];
    if (!searchTerm) return contract;
    const filter = ({ cui, contractNumber }: Contract) => {
      return isNaN(+searchTerm)
        ? contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
        : cui.startsWith(searchTerm);
    };
    return contract.filter(filter);
  }, [searchTerm, contract]);

  return { searchTerm, handleSearchChange, newfilterContract };
};

export default useFilterContract;
