import { useQuery } from '@tanstack/react-query';
import { procedureUserLookupsService } from '../services/userLookups.service';

const PROCEDURE_USER_OPTIONS_STALE_TIME = 5 * 60 * 1000;

export const procedureUserOptionsQueryKeys = {
  license: ['procedure-license-users'] as const,
  productionBonus: ['procedure-production-bonus-users'] as const,
  paymail: ['procedure-paymail-users'] as const,
  paymailModerators: ['procedure-paymail-moderator-users'] as const,
};

type UseProcedureUserOptions = {
  enabled?: boolean;
};

export const useLicenseUsers = ({
  enabled = true,
}: UseProcedureUserOptions = {}) =>
  useQuery({
    queryKey: procedureUserOptionsQueryKeys.license,
    queryFn: () => procedureUserLookupsService.getLicenseUsers(),
    enabled,
    staleTime: PROCEDURE_USER_OPTIONS_STALE_TIME,
  });

export const useProductionBonusUsers = ({
  enabled = true,
}: UseProcedureUserOptions = {}) =>
  useQuery({
    queryKey: procedureUserOptionsQueryKeys.productionBonus,
    queryFn: () => procedureUserLookupsService.getProductionBonusUsers(),
    enabled,
    staleTime: PROCEDURE_USER_OPTIONS_STALE_TIME,
  });

export const usePaymailUsers = ({
  enabled = true,
}: UseProcedureUserOptions = {}) =>
  useQuery({
    queryKey: procedureUserOptionsQueryKeys.paymail,
    queryFn: () => procedureUserLookupsService.getPaymailUsers(),
    enabled,
    staleTime: PROCEDURE_USER_OPTIONS_STALE_TIME,
  });

export const usePaymailModeratorUsers = ({
  enabled = true,
}: UseProcedureUserOptions = {}) =>
  useQuery({
    queryKey: procedureUserOptionsQueryKeys.paymailModerators,
    queryFn: () => procedureUserLookupsService.getPaymailModeratorUsers(),
    enabled,
    staleTime: PROCEDURE_USER_OPTIONS_STALE_TIME,
  });
