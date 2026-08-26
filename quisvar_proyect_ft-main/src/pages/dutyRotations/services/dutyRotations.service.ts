import { axiosInstance } from '@/services/axiosInstance';
import {
  decodeBulkDeleteAssignmentsResponse,
  decodeDutyAssignmentResponse,
  decodeDutyAssignmentsResponse,
  decodeDutyEntitlementsResponse,
  decodeDutyImpactResponse,
  decodeDutyMutationResponse,
  decodeDutyPreviewResponse,
  decodeDutyReconciliationResponse,
  decodeDutyRotationsResponse,
  decodeDutyStatusPreviewResponse,
  decodeDutyStatusMutationResponse,
  decodeDutyEligibleRosterResponse,
  decodeDutyOccurrenceExclusionResponse,
  decodeDutyRosterSyncPreviewResponse,
  decodeDutySwapResponse,
  decodeDutySwapsResponse,
  DutyRotationContractError,
  requireArrayResponse,
} from '../dutyRotations.contract';
import type {
  DutyAssignmentFilters,
  DutyBulkDeleteAssignmentsPayload,
  DutyDraft,
  DutyEditPayload,
  DutyRoleOption,
  DutyUser,
} from '../models/dutyRotations.types';

const noLoaderHeaders = { headers: { noLoader: true } };

type DutyRotationUserLookupResponse = {
  id: number;
  name?: string;
  label?: string;
  email: string;
  status?: boolean;
  role?: DutyRoleOption | null;
  dni?: string | null;
  phone?: string | null;
};

const mapDutyRotationUser = (value: unknown): DutyUser => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !('email' in value) ||
    typeof value.email !== 'string'
  ) {
    throw new DutyRotationContractError(
      'El selector de participantes recibió un usuario incompatible.'
    );
  }
  const user = value as DutyRotationUserLookupResponse;
  const displayName = user.name || user.label || user.email;
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    roleId: user.role?.id ?? null,
    role: user.role,
    profile: {
      firstName: displayName,
      lastName: '',
      dni: user.dni ?? '',
      phone: user.phone ?? '',
    },
  };
};

export const getDutyRotations = async () => {
  const response = await axiosInstance.get<unknown>('/duty-rotations/duties', {
    params: { includeInactive: true },
    ...noLoaderHeaders,
  });
  return decodeDutyRotationsResponse(response.data);
};

export const previewDutyRotation = async (
  draft: DutyDraft,
  signal?: AbortSignal
) => {
  const response = await axiosInstance.post<unknown>(
    '/duty-rotations/duties/preview',
    draft,
    { ...noLoaderHeaders, signal }
  );
  return decodeDutyPreviewResponse(response.data);
};

export const createDutyRotation = async (
  draft: DutyDraft,
  requestKey: string
) => {
  const response = await axiosInstance.post<unknown>('/duty-rotations/duties', {
    draft,
    requestKey,
  });
  return decodeDutyMutationResponse(response.data);
};

export const previewDutyRotationEdit = async (
  dutyId: string,
  payload: DutyEditPayload,
  signal?: AbortSignal
) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/duties/${dutyId}/edit-preview`,
    payload,
    { ...noLoaderHeaders, signal }
  );
  return decodeDutyImpactResponse(response.data);
};

export const updateDutyRotation = async (
  dutyId: string,
  payload: DutyEditPayload
) => {
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/duties/${dutyId}`,
    payload
  );
  return decodeDutyMutationResponse(response.data);
};

export const previewDutyRotationStatus = async (
  dutyId: string,
  isActive: boolean,
  expectedVersion: number
) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/duties/${dutyId}/status-preview`,
    { isActive, expectedVersion },
    noLoaderHeaders
  );
  return decodeDutyStatusPreviewResponse(response.data);
};

export const updateDutyRotationStatus = async (
  dutyId: string,
  isActive: boolean,
  expectedVersion: number,
  requestKey: string
) => {
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/duties/${dutyId}/status`,
    { isActive, expectedVersion, requestKey }
  );
  return decodeDutyStatusMutationResponse(response.data);
};

export const repairDutyRotation = async (dutyId: string) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/duties/${dutyId}/reconcile`,
    {}
  );
  return decodeDutyReconciliationResponse(response.data);
};

export const getDutyEligibleRoster = async () => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/eligible-roster',
    noLoaderHeaders
  );
  return decodeDutyEligibleRosterResponse(response.data);
};

export const previewDutyRosterSync = async (
  dutyId: string,
  payload: {
    effectiveFrom: string;
    expectedVersion: number;
    rosterFingerprint: string;
  }
) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/duties/${dutyId}/roster-sync-preview`,
    payload,
    noLoaderHeaders
  );
  return decodeDutyRosterSyncPreviewResponse(response.data);
};

export const confirmDutyRosterSync = async (
  dutyId: string,
  payload: {
    effectiveFrom: string;
    expectedVersion: number;
    rosterFingerprint: string;
    requestKey: string;
  }
) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/duties/${dutyId}/roster-sync`,
    payload
  );
  return decodeDutyMutationResponse(response.data);
};

export const getDutyOccurrence = async (
  dutyId: string,
  occurrenceKey: string
) => {
  const response = await axiosInstance.get<unknown>(
    `/duty-rotations/duties/${dutyId}/occurrences/${encodeURIComponent(
      occurrenceKey
    )}`,
    noLoaderHeaders
  );
  return decodeDutyOccurrenceExclusionResponse(response.data);
};

export const previewDutyOccurrenceExclusions = async (
  dutyId: string,
  occurrenceKey: string,
  payload: { excludedUserIds: number[]; expectedVersion: number }
) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/duties/${dutyId}/occurrences/${encodeURIComponent(
      occurrenceKey
    )}/exclusions-preview`,
    payload,
    noLoaderHeaders
  );
  return decodeDutyOccurrenceExclusionResponse(response.data);
};

export const updateDutyOccurrenceExclusions = async (
  dutyId: string,
  occurrenceKey: string,
  payload: {
    excludedUserIds: number[];
    reason?: string;
    expectedVersion: number;
    requestKey: string;
  }
) => {
  const response = await axiosInstance.put<unknown>(
    `/duty-rotations/duties/${dutyId}/occurrences/${encodeURIComponent(
      occurrenceKey
    )}/exclusions`,
    payload
  );
  return decodeDutyOccurrenceExclusionResponse(response.data);
};

export const getDutyAssignments = async (
  filters: DutyAssignmentFilters = {}
) => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/assignments',
    { params: filters, ...noLoaderHeaders }
  );
  return decodeDutyAssignmentsResponse(response.data);
};

export const getMyUpcomingDutyAssignments = async () => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/assignments/my-upcoming',
    noLoaderHeaders
  );
  return decodeDutyAssignmentsResponse(response.data);
};

export const getMyDutyEntitlements = async (capabilityKey?: string) => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/entitlements/my',
    {
      params: capabilityKey ? { capabilityKey } : undefined,
      ...noLoaderHeaders,
    }
  );
  return decodeDutyEntitlementsResponse(response.data);
};

export const completeDutyAssignment = async (
  assignmentId: string,
  payload: {
    executedByUserId?: number;
    resolutionNotes?: string;
    requestKey: string;
    evidences?: File[];
  }
) => {
  const form = new FormData();
  if (payload.executedByUserId) {
    form.append('executedByUserId', String(payload.executedByUserId));
  }
  if (payload.resolutionNotes) {
    form.append('resolutionNotes', payload.resolutionNotes);
  }
  form.append('requestKey', payload.requestKey);
  payload.evidences?.forEach(file => form.append('evidence', file));
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/assignments/${assignmentId}/complete`,
    form
  );
  return decodeDutyAssignmentResponse(response.data);
};

export const reassignDutyAssignment = async (
  assignmentId: string,
  assignedUserId: number
) => {
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/assignments/${assignmentId}/reassign`,
    { assignedUserId }
  );
  return decodeDutyAssignmentResponse(response.data);
};

export const bulkDeleteDutyAssignments = async (
  payload: DutyBulkDeleteAssignmentsPayload
) => {
  const response = await axiosInstance.delete<unknown>(
    '/duty-rotations/assignments/bulk',
    { data: payload }
  );
  return decodeBulkDeleteAssignmentsResponse(response.data);
};

export const createDutySwapRequest = async (
  assignmentId: string,
  payload: { targetUserId?: number | null; reason?: string }
) => {
  const response = await axiosInstance.post<unknown>(
    `/duty-rotations/assignments/${assignmentId}/swap-requests`,
    payload
  );
  return decodeDutySwapResponse(response.data);
};

export const getPendingDirectedDutySwapRequests = async () => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/swap-requests/pending-directed',
    noLoaderHeaders
  );
  return decodeDutySwapsResponse(response.data);
};

export const approveDutySwapRequest = async (swapRequestId: string) => {
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/swap-requests/${swapRequestId}/approve`,
    {}
  );
  return decodeDutyAssignmentResponse(response.data);
};

export const rejectDutySwapRequest = async (swapRequestId: string) => {
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/swap-requests/${swapRequestId}/reject`,
    {}
  );
  return decodeDutySwapResponse(response.data);
};

export const getOpenPoolDutyRequests = async () => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/open-pool',
    noLoaderHeaders
  );
  return decodeDutySwapsResponse(response.data);
};

export const claimOpenPoolDuty = async (swapRequestId: string) => {
  const response = await axiosInstance.patch<unknown>(
    `/duty-rotations/open-pool/${swapRequestId}/claim`,
    {}
  );
  return decodeDutyAssignmentResponse(response.data);
};

export const openDutyAssignmentEvidence = async (contentUrl: string) => {
  const previewWindow = window.open('about:blank', '_blank');
  if (previewWindow) previewWindow.opener = null;
  try {
    const response = await axiosInstance.get<Blob>(contentUrl, {
      responseType: 'blob',
      ...noLoaderHeaders,
    });
    const url = URL.createObjectURL(response.data);
    if (previewWindow) {
      previewWindow.location.replace(url);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
};

export const getDutyRotationUsers = async () => {
  const response = await axiosInstance.get<unknown>(
    '/duty-rotations/users',
    noLoaderHeaders
  );
  return requireArrayResponse(
    response.data,
    'el selector de participantes'
  ).map(mapDutyRotationUser);
};

export const getDutyRotationRoles = async () => {
  const response = await axiosInstance.get<unknown>(
    '/role/form',
    noLoaderHeaders
  );
  return requireArrayResponse(response.data, 'el selector de roles').map(
    role => {
      if (
        !role ||
        typeof role !== 'object' ||
        !('id' in role) ||
        typeof role.id !== 'number' ||
        !('name' in role) ||
        typeof role.name !== 'string'
      ) {
        throw new DutyRotationContractError(
          'El selector de roles recibió una opción incompatible.'
        );
      }
      return { id: role.id, name: role.name };
    }
  );
};
