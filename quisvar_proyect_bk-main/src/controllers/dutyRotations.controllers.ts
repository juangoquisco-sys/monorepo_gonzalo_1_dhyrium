import type { ControllerFunction } from '@/types/patterns';
import type { UserType } from '@/middlewares/auth.middleware';
import DutyAssignmentService from '@/services/rotations/assignment.service';
import DutyRotationService from '@/services/rotations/duty.service';
import RotationEntitlementService from '@/services/rotations/entitlement.service';
import DutySwapService from '@/services/rotations/swap.service';
import DutyEvidenceService, {
  cleanupDutyEvidence,
  mapUploadedDutyEvidence,
} from '@/services/rotations/dutyEvidence.service';
import { assertDutyEvidenceFiles } from '@/middlewares/dutyEvidence.middleware';
import role from '@/middlewares/role.middleware';
import {
  bulkDeleteAssignmentsRequestSchema,
  claimOpenPoolRequestSchema,
  completeAssignmentRequestSchema,
  createDutyRequestSchema,
  createSwapRequestSchema,
  listAssignmentsRequestSchema,
  listDutiesRequestSchema,
  listOpenPoolRequestSchema,
  listPendingDirectedSwapRequestsSchema,
  myEntitlementsRequestSchema,
  myUpcomingRequestSchema,
  previewDutyEditRequestSchema,
  previewDutyRequestSchema,
  previewDutyStatusRequestSchema,
  reassignAssignmentRequestSchema,
  repairDutyRequestSchema,
  swapActionRequestSchema,
  updateDutyRequestSchema,
  updateDutyStatusRequestSchema,
  getEvidenceContentRequestSchema,
  getOccurrenceRequestSchema,
  previewOccurrenceExclusionsRequestSchema,
  previewRosterSyncRequestSchema,
  confirmRosterSyncRequestSchema,
  updateOccurrenceExclusionsRequestSchema,
} from '@/services/rotations/duty.schema';

export const getEligibleRoster: ControllerFunction = async (_req, res) => {
  res.status(200).json(await DutyRotationService.eligibleRoster());
};

export const listDuties: ControllerFunction = async (req, res) => {
  const input = listDutiesRequestSchema.parse({ query: req.query });
  res
    .status(200)
    .json(await DutyRotationService.list(input.query.includeInactive ?? false));
};

export const previewDuty: ControllerFunction = async (req, res) => {
  const input = previewDutyRequestSchema.parse({ body: req.body });
  res.status(200).json(await DutyRotationService.preview(input.body));
};

export const createDuty: ControllerFunction = async (req, res) => {
  const input = createDutyRequestSchema.parse({ body: req.body });
  res
    .status(201)
    .json(
      await DutyRotationService.create(input.body.draft, input.body.requestKey)
    );
};

export const previewDutyEdit: ControllerFunction = async (req, res) => {
  const input = previewDutyEditRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(await DutyRotationService.previewEdit(input.params.id, input.body));
};

export const updateDuty: ControllerFunction = async (req, res) => {
  const input = updateDutyRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(await DutyRotationService.update(input.params.id, input.body));
};

export const previewDutyStatus: ControllerFunction = async (req, res) => {
  const input = previewDutyStatusRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(
      await DutyRotationService.previewStatus(
        input.params.id,
        input.body.isActive,
        input.body.expectedVersion
      )
    );
};

export const updateDutyStatus: ControllerFunction = async (req, res) => {
  const input = updateDutyStatusRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(
      await DutyRotationService.setStatus(
        input.params.id,
        input.body.isActive,
        input.body.expectedVersion,
        input.body.requestKey
      )
    );
};

export const repairDuty: ControllerFunction = async (req, res) => {
  const input = repairDutyRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res.status(200).json(await DutyRotationService.repair(input.params.id));
};

export const previewDutyRosterSync: ControllerFunction = async (req, res) => {
  const input = previewRosterSyncRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(
      await DutyRotationService.previewRosterSync(input.params.id, input.body)
    );
};

export const confirmDutyRosterSync: ControllerFunction = async (req, res) => {
  const input = confirmRosterSyncRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(
      await DutyRotationService.confirmRosterSync(input.params.id, input.body)
    );
};

export const getDutyOccurrence: ControllerFunction = async (req, res) => {
  const input = getOccurrenceRequestSchema.parse({ params: req.params });
  res
    .status(200)
    .json(
      await DutyRotationService.getOccurrence(
        input.params.id,
        input.params.occurrenceKey
      )
    );
};

export const previewDutyOccurrenceExclusions: ControllerFunction = async (
  req,
  res
) => {
  const input = previewOccurrenceExclusionsRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(
      await DutyRotationService.previewOccurrenceExclusions(
        input.params.id,
        input.params.occurrenceKey,
        input.body
      )
    );
};

export const updateDutyOccurrenceExclusions: ControllerFunction = async (
  req,
  res
) => {
  const input = updateOccurrenceExclusionsRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const userInfo: UserType = res.locals.userInfo;
  res
    .status(200)
    .json(
      await DutyRotationService.updateOccurrenceExclusions(
        input.params.id,
        input.params.occurrenceKey,
        input.body,
        userInfo.id
      )
    );
};

export const listAssignments: ControllerFunction = async (req, res) => {
  const input = listAssignmentsRequestSchema.parse({ query: req.query });
  res.status(200).json(await DutyAssignmentService.list(input.query));
};

export const myUpcomingAssignments: ControllerFunction = async (req, res) => {
  myUpcomingRequestSchema.parse({ query: req.query });
  const userInfo: UserType = res.locals.userInfo;
  res.status(200).json(await DutyAssignmentService.myUpcoming(userInfo.id));
};

export const myEntitlements: ControllerFunction = async (req, res) => {
  const input = myEntitlementsRequestSchema.parse({ query: req.query });
  const userInfo: UserType = res.locals.userInfo;
  res
    .status(200)
    .json(
      await RotationEntitlementService.listMyOpenEntitlements(
        userInfo.id,
        input.query.capabilityKey
      )
    );
};

export const completeAssignment: ControllerFunction = async (req, res) => {
  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  const evidences = mapUploadedDutyEvidence(uploadedFiles);
  let result: Awaited<ReturnType<typeof DutyAssignmentService.complete>>;
  try {
    await assertDutyEvidenceFiles(uploadedFiles);
    const input = completeAssignmentRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const userInfo: UserType = res.locals.userInfo;
    result = await DutyAssignmentService.complete(
      input.params.id,
      userInfo.id,
      input.body,
      evidences
    );
  } catch (error) {
    await cleanupDutyEvidence(evidences);
    throw error;
  }
  res.status(200).json(result);
};

export const getAssignmentEvidenceContent: ControllerFunction = async (
  req,
  res
) => {
  const input = getEvidenceContentRequestSchema.parse({ params: req.params });
  const userInfo: UserType = res.locals.userInfo;
  const canAudit =
    role.accessMenuPoint(userInfo, ['MOD'], 'rotaciones', 'configuracion') ||
    role.accessMenuPoint(userInfo, ['MOD'], 'rotaciones', 'reporte-operativo');
  const evidence = await DutyEvidenceService.content(
    input.params.id,
    input.params.evidenceId,
    userInfo.id,
    canAudit
  );
  res.type(evidence.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(evidence.originalName)}`
  );
  res.sendFile(evidence.absolutePath);
};

export const reassignAssignment: ControllerFunction = async (req, res) => {
  const input = reassignAssignmentRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res
    .status(200)
    .json(await DutyAssignmentService.reassign(input.params.id, input.body));
};

export const bulkDeleteAssignments: ControllerFunction = async (req, res) => {
  const input = bulkDeleteAssignmentsRequestSchema.parse({ body: req.body });
  res.status(200).json(await DutyAssignmentService.bulkDelete(input.body));
};

export const createSwapRequest: ControllerFunction = async (req, res) => {
  const input = createSwapRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const userInfo: UserType = res.locals.userInfo;
  res
    .status(201)
    .json(
      await DutySwapService.requestSwap(
        input.params.id,
        userInfo.id,
        input.body
      )
    );
};

export const approveSwapRequest: ControllerFunction = async (req, res) => {
  const input = swapActionRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res.status(200).json(await DutySwapService.approve(input.params.id));
};

export const rejectSwapRequest: ControllerFunction = async (req, res) => {
  const input = swapActionRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  res.status(200).json(await DutySwapService.reject(input.params.id));
};

export const listPendingDirectedSwapRequests: ControllerFunction = async (
  req,
  res
) => {
  listPendingDirectedSwapRequestsSchema.parse({ query: req.query });
  res.status(200).json(await DutySwapService.listPendingDirected());
};

export const listOpenPool: ControllerFunction = async (req, res) => {
  listOpenPoolRequestSchema.parse({ query: req.query });
  const userInfo: UserType = res.locals.userInfo;
  res.status(200).json(await DutySwapService.openPool(userInfo.id));
};

export const claimOpenPool: ControllerFunction = async (req, res) => {
  const input = claimOpenPoolRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const userInfo: UserType = res.locals.userInfo;
  res
    .status(200)
    .json(await DutySwapService.claim(input.params.swapRequestId, userInfo.id));
};
