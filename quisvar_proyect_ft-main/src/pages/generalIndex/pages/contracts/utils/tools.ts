import type { ContractIndexData } from '@/types/types';
import { millisecondsToDays } from '@/utils/formatDate';
import type { PhaseData } from '../pages/detailsContracts/models/type';

export const getStatusContract = (
  createdAt: string | null,
  phases: string | PhaseData[] | null | undefined,
  contractIndex: string | ContractIndexData[] | null | undefined
) => {
  const phasesParse = parseContractPhases(phases);
  const contractIndexParse = parseContractIndex(contractIndex);
  const phaseLevel = contractIndexParse[1]?.nextLevel?.[1]?.nextLevel;
  const findActualIndexPhase = phaseLevel?.find(
    phase => phase?.hasFile === 'no'
  );
  const findPhase = phasesParse.find(
    daPhase => daPhase.id === findActualIndexPhase?.deliverLettersId
  );
  if (!findPhase || !createdAt) return 'grey';
  return getStatusColor(createdAt, findPhase, new Date());
};

export const parseContractIndex = (
  contractIndex: string | ContractIndexData[] | null | undefined
): ContractIndexData[] => parseJsonArray<ContractIndexData>(contractIndex);

export const parseContractPhases = (
  phases: string | PhaseData[] | null | undefined
): PhaseData[] => parseJsonArray<PhaseData>(phases);

const parseJsonArray = <T>(value: string | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getStatusColor = (
  createdAt: string,
  phase: PhaseData,
  uploadDate: Date
) => {
  const dayPhase = phase?.realDay ?? 0;
  const contractSigningDate = new Date(createdAt);
  const actualDate = new Date(uploadDate);
  contractSigningDate.setDate(
    contractSigningDate.getDate() + Number(dayPhase) + 1
  );
  const daysDifference = millisecondsToDays(
    contractSigningDate.valueOf() - actualDate.valueOf()
  );
  if (Math.sign(daysDifference) === -1) return 'red';
  if (daysDifference - 14 < 0) return 'yellow';
  return 'skyBlue';
};
