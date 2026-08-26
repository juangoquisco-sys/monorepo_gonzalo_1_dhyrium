import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
import {
  approveGateReviewRequest,
  approvePendingGateLicense,
  approvePendingGatePassReviews,
  createGatePass,
  directGatePenaltyAdjustment,
  gateFineReport,
  gatePassHistory,
  gateSummary,
  gateTardinessRanking,
  listActiveGatePasses,
  listAuthorizedGateLicenses,
  listPendingGateLicenses,
  listMyGatePassHistory,
  listGatePenaltyAdjustmentCandidates,
  listMyActiveGatePasses,
  listGateReviewRequests,
  markGatePassReturn,
  rejectGateReviewRequest,
  rejectPendingGatePassReviews,
  searchGateUsers,
  submitGateReviewRequest,
  upsertGateFineAdjustment,
  voidGateFineAdjustment,
} from '@/controllers/gateControl.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/users/search',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  searchGateUsers
);

router.post(
  '/passes',
  role.RoleHandler(['MOD', 'USER'], 'control-puerta'),
  uploads.gateControl.array('evidence'),
  createGatePass
);

router.get(
  '/passes/active',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  listActiveGatePasses
);

router.get(
  '/licenses/pending',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  listPendingGateLicenses
);

router.get(
  '/licenses/authorized',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  listAuthorizedGateLicenses
);

router.patch(
  '/licenses/:id/approve',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  approvePendingGateLicense
);

router.get(
  '/passes/my-active',
  role.RoleHandler(['MOD', 'USER'], 'control-puerta', 'mi-control'),
  listMyActiveGatePasses
);

router.get(
  '/passes/my-history',
  role.RoleHandler(['MOD', 'USER'], 'control-puerta', 'mi-control'),
  listMyGatePassHistory
);

router.patch(
  '/passes/:id/return',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  markGatePassReturn
);

router.get(
  '/passes/history',
  role.RoleHandler(['MOD'], 'control-puerta', 'historial'),
  gatePassHistory
);

router.get(
  '/summary',
  role.RoleHandler(['MOD'], 'control-puerta', 'monitor'),
  gateSummary
);

router.get(
  '/tardiness-ranking',
  role.RoleHandler(['MOD'], 'control-puerta', 'historial'),
  gateTardinessRanking
);

router.get(
  '/report/fines',
  role.RoleHandler(['MOD'], 'control-puerta', 'historial'),
  gateFineReport
);

router.post(
  '/report/fines/adjustments',
  role.RoleHandler(['MOD'], 'control-puerta', 'historial'),
  upsertGateFineAdjustment
);

router.patch(
  '/report/fines/adjustments/void',
  role.RoleHandler(['MOD'], 'control-puerta', 'historial'),
  voidGateFineAdjustment
);

router.post(
  '/passes/:id/review-requests',
  role.RoleHandler(['MOD', 'USER'], 'control-puerta', 'mi-control'),
  uploads.gateControl.array('evidence'),
  submitGateReviewRequest
);

router.get(
  '/review-requests',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  listGateReviewRequests
);

router.get(
  '/penalty-adjustment-candidates',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  listGatePenaltyAdjustmentCandidates
);

router.patch(
  '/passes/:id/review-requests/approve-pending',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  approvePendingGatePassReviews
);

router.patch(
  '/passes/:id/review-requests/reject-pending',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  rejectPendingGatePassReviews
);

router.patch(
  '/review-requests/:id/approve',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  approveGateReviewRequest
);

router.patch(
  '/review-requests/:id/reject',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  rejectGateReviewRequest
);

router.patch(
  '/passes/:id/penalty-adjustment',
  role.RoleHandler(['MOD'], 'control-puerta', 'regularizaciones'),
  directGatePenaltyAdjustment
);

export default router;
