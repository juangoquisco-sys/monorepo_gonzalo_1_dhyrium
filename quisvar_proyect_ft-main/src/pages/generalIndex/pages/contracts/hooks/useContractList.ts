import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';
import type { Contract } from '@/types/types';
import type { ContractType } from '../models/type.contracts';

export type ContractOrganizationKind = 'company' | 'consortium';

export interface ContractOrganizationOption {
  id: number;
  name: string;
  kind: ContractOrganizationKind;
  contractCount: number;
}

export interface ContractListFilters {
  query?: string;
  year?: string;
  type?: ContractType;
  organization?: string;
}

const parseOrganization = (organization?: string) => {
  const [kind, id] = organization?.split(':') || [];
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return {};
  if (kind === 'company') return { companyId: parsedId };
  if (kind === 'consortium') return { consortiumId: parsedId };
  return {};
};

export const useContractList = (filters: ContractListFilters) =>
  useQuery({
    queryKey: ['contracts', filters],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Contract[]>('/contract', {
        params: {
          q: filters.query || undefined,
          year: filters.year || undefined,
          type: filters.type || undefined,
          ...parseOrganization(filters.organization),
        },
      });
      return data;
    },
  });

export const useContractOrganizationOptions = () =>
  useQuery({
    queryKey: ['contracts', 'filter-options', 'organizations'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<ContractOrganizationOption[]>(
        '/contract/filter-options/organizations'
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

export const contractQueryKey = ['contracts'] as const;
