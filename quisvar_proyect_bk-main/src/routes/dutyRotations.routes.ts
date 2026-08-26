import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import {
  approveSwapRequest,
  bulkDeleteAssignments,
  claimOpenPool,
  completeAssignment,
  getAssignmentEvidenceContent,
  getDutyOccurrence,
  getEligibleRoster,
  createDuty,
  createSwapRequest,
  listAssignments,
  listDuties,
  listPendingDirectedSwapRequests,
  myEntitlements,
  listOpenPool,
  myUpcomingAssignments,
  reassignAssignment,
  repairDuty,
  rejectSwapRequest,
  previewDuty,
  previewDutyEdit,
  previewDutyStatus,
  updateDuty,
  updateDutyStatus,
  previewDutyRosterSync,
  confirmDutyRosterSync,
  previewDutyOccurrenceExclusions,
  updateDutyOccurrenceExclusions,
} from '@/controllers/dutyRotations.controllers';
import { getRotationUserOptions } from '@/controllers/userLookup.controllers';
import { handleDutyEvidenceUpload } from '@/middlewares/dutyEvidence.middleware';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/users',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  getRotationUserOptions
);
router.get(
  '/eligible-roster',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  getEligibleRoster
);
router.get(
  '/duties',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  listDuties
);
router.post(
  '/duties/preview',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  previewDuty
);
router.post(
  '/duties',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  createDuty
);
router.post(
  '/duties/:id/edit-preview',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  previewDutyEdit
);
router.patch(
  '/duties/:id',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  updateDuty
);
router.post(
  '/duties/:id/status-preview',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  previewDutyStatus
);
router.patch(
  '/duties/:id/status',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  updateDutyStatus
);
router.post(
  '/duties/:id/reconcile',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  repairDuty
);
router.post(
  '/duties/:id/roster-sync-preview',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  previewDutyRosterSync
);
router.post(
  '/duties/:id/roster-sync',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  confirmDutyRosterSync
);
router.get(
  '/duties/:id/occurrences/:occurrenceKey',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  getDutyOccurrence
);
router.post(
  '/duties/:id/occurrences/:occurrenceKey/exclusions-preview',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  previewDutyOccurrenceExclusions
);
router.put(
  '/duties/:id/occurrences/:occurrenceKey/exclusions',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  updateDutyOccurrenceExclusions
);

router.get(
  '/assignments',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  listAssignments
);
router.get(
  '/assignments/my-upcoming',
  role.RoleHandler(['MOD'], 'rotaciones', 'mis-turnos'),
  myUpcomingAssignments
);
router.get(
  '/entitlements/my',
  role.RoleHandler(['MOD'], 'rotaciones', 'mis-turnos'),
  myEntitlements
);
router.patch(
  '/assignments/:id/reassign',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  reassignAssignment
);
router.delete(
  '/assignments/bulk',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  bulkDeleteAssignments
);
router.patch(
  '/assignments/:id/complete',
  role.RoleHandler(['MOD'], 'rotaciones', 'mis-turnos'),
  handleDutyEvidenceUpload,
  completeAssignment
);
router.get(
  '/assignments/:id/evidences/:evidenceId/content',
  role.AnyRoleHandler([
    { typeRol: ['MOD'], menu: 'rotaciones', subMenu: 'configuracion' },
    { typeRol: ['MOD'], menu: 'rotaciones', subMenu: 'reporte-operativo' },
    { typeRol: ['MOD'], menu: 'rotaciones', subMenu: 'mis-turnos' },
  ]),
  getAssignmentEvidenceContent
);
router.post(
  '/assignments/:id/swap-requests',
  role.RoleHandler(['MOD'], 'rotaciones', 'mis-turnos'),
  createSwapRequest
);

router.patch(
  '/swap-requests/:id/approve',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  approveSwapRequest
);
router.patch(
  '/swap-requests/:id/reject',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  rejectSwapRequest
);
router.get(
  '/swap-requests/pending-directed',
  role.RoleHandler(['MOD'], 'rotaciones', 'configuracion'),
  listPendingDirectedSwapRequests
);

router.get(
  '/open-pool',
  role.RoleHandler(['MOD'], 'rotaciones', 'mis-turnos'),
  listOpenPool
);
router.patch(
  '/open-pool/:swapRequestId/claim',
  role.RoleHandler(['MOD'], 'rotaciones', 'mis-turnos'),
  claimOpenPool
);

export default router;
