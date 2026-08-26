import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import LicencesController, {
  createLicense,
  createFreeForAll,
  updateLicense,
  approveLicense,
  getLicenseById,
  getLicensesByStatus,
  getLicensesEmployee,
  expiredLicenses,
  deleteLicense,
  activeLicenses,
  getLicensesFee,
  getLicensesFineReport,
  upsertLicensePenaltyAdjustments,
  voidLicensePenaltyAdjustments,
  updateCheckOut,
} from '@/controllers/licenses.controllers';
import { _admin_role, _employee_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
import { getLicenseUserOptions } from '@/controllers/userLookup.controllers';
// import { role } from '../middlewares';
const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(_employee_role);
router.get('/licenses-user/:id', LicencesController.getByUser);
// router.use(role.RoleHandler('licencias', 'USER'));
router.get('/employee/:id', getLicensesEmployee);
router.get('/fee/:id', getLicensesFee);
router.post('/', uploads.licenseResolution.single('resolution'), createLicense);
router.patch(
  '/:id',
  uploads.licenseResolution.single('resolution'),
  updateLicense
);
router.patch('/checkout/:id', updateCheckOut);
router.get('/active', activeLicenses);
router.delete('/:id', deleteLicense);
//ADMIN ROLE
router.use(_admin_role);
router.get('/users/options', getLicenseUserOptions);
router.post('/free', createFreeForAll);
router.patch('/approve/:id', approveLicense);
// router.use(role.RoleHandler('licencias', 'MOD'));
router.get('/report/fines', getLicensesFineReport);
router.post('/report/fines/adjustments', upsertLicensePenaltyAdjustments);
router.patch('/report/fines/adjustments/void', voidLicensePenaltyAdjustments);
router.get('/', getLicenseById);
router.get('/status', getLicensesByStatus);
router.post('/expired', expiredLicenses);
export default router;
