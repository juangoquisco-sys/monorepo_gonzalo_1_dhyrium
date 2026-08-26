import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import CompanyController, {
  createCompany,
  getCompaniesById,
  getCompany,
  updateCompaniesById,
  updateCompanieInvoiceById,
} from '@/controllers/companies.controller';
import { _admin_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
const router = Router();
const { deleteImg, updateImg } = CompanyController;
router.use(authenticateHandler);
router.use(_admin_role);
router.get('/', getCompany);
router.get('/information/:id', getCompaniesById);
router.patch('/:id', updateCompaniesById);
router.put('/:id/invoice', updateCompanieInvoiceById);
router.patch('/:id', updateCompaniesById);
router.post('/', uploads.companies.fields([{ name: 'img' }]), createCompany);
//COMPANIES IMG
router.patch('/img/:id', uploads.companies.single('img'), updateImg);
router.delete('/img/:id', deleteImg);
export default router;
