import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import ListController, {
  closeBiometricAttendance,
  createList,
  discardAttendance,
  finalizeAttendance,
  getCurrentAttendance,
  getAllListByDate,
  getPendingAttendance,
  getListRange,
  updateAttendanceBatch,
} from '@/controllers/list.controller';
import role from '@/middlewares/role.middleware';
const router = Router();
router.use(authenticateHandler);
router.get(
  '/attendance-user/:id',
  role.RoleHandler(['MOD', 'USER'], 'control-asistencia', 'incidencias'),
  ListController.getByUser
);
router.get('/attendance/current', getCurrentAttendance);
router.get('/biometric/active', getCurrentAttendance);
router.use(role.RoleHandler(['MOD'], 'control-asistencia', 'registro'));
router.get('/pending', getPendingAttendance);
router.post('/', createList);
router.post('/:id/close', closeBiometricAttendance);
router.post('/:id/finalize', finalizeAttendance);
router.patch('/:id/attendance/batch', updateAttendanceBatch);
router.delete('/:id', discardAttendance);
router.get('/attendance', getAllListByDate);
router.get('/attendance/range', getListRange);
export default router;
