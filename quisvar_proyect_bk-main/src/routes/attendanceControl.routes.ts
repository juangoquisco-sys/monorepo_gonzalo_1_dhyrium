import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import {
  createAttendanceReconciliation,
  getAttendanceFineReport,
  listAttendanceIncidents,
  listAttendanceReconciliationCandidates,
  listAttendanceReconciliations,
  listAttendanceReconciliationSummary,
  upsertAttendancePenaltyAdjustments,
  voidAttendancePenaltyAdjustments,
  voidAttendanceReconciliation,
} from '@/controllers/attendanceControl.controllers';
import { getAttendanceControlUserOptions } from '@/controllers/userLookup.controllers';

const router = Router();

router.use(authenticateHandler);

const reconciliationAccess = role.AnyRoleHandler([
  {
    typeRol: ['MOD'],
    menu: 'control-asistencia',
    subMenu: 'reconciliar-faltas',
  },
  { typeRol: ['MOD'], menu: 'rotaciones', subMenu: 'mis-turnos' },
]);

router.get(
  '/incidents',
  role.RoleHandler(['MOD', 'USER'], 'control-asistencia', 'incidencias'),
  listAttendanceIncidents
);

router.get(
  '/users',
  role.RoleHandler(['MOD'], 'control-asistencia', 'incidencias'),
  getAttendanceControlUserOptions
);

router.get(
  '/reconciliation-summary',
  reconciliationAccess,
  listAttendanceReconciliationSummary
);

router.get('/report/fines', reconciliationAccess, getAttendanceFineReport);

router.post(
  '/report/fines/adjustments',
  reconciliationAccess,
  upsertAttendancePenaltyAdjustments
);

router.patch(
  '/report/fines/adjustments/void',
  reconciliationAccess,
  voidAttendancePenaltyAdjustments
);

router.get(
  '/reconciliation-candidates',
  reconciliationAccess,
  listAttendanceReconciliationCandidates
);

router.post(
  '/reconciliations',
  reconciliationAccess,
  createAttendanceReconciliation
);

router.get(
  '/reconciliations',
  reconciliationAccess,
  listAttendanceReconciliations
);

router.patch(
  '/reconciliations/:id/void',
  reconciliationAccess,
  voidAttendanceReconciliation
);

export default router;
