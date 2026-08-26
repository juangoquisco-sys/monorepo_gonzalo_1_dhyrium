import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  createConsortium,
  createRelationConsortium,
  deleteById,
  deleteImg,
  deleteRelationConsortium,
  getAllConsortium,
  getBoth,
  getConsortiumById,
  updateById,
  updateImg,
  updatePercentaje,
} from '@/controllers/consortium.controller';
import { _admin_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
const router = Router();
router.use(authenticateHandler);
//Admin role
router.use(_admin_role);
router.post(
  '/',
  uploads.consortium.fields([{ name: 'img' }]),
  createConsortium
);
router.get('/all', getAllConsortium);
//CONSORTIUM AND COMPANIES
router.get('/both', getBoth);
router.get('/:id', getConsortiumById);
router.patch('/:id', updateById);
router.patch('/relation/all/:consortiumId', updatePercentaje);
router.delete('/:id', deleteById);
//CONSORTIUM IMG
router.patch(
  '/img/:id',
  uploads.consortium.fields([{ name: 'img' }]),
  updateImg
);
router.delete('/img/:id', deleteImg);
//CONSORTIUM RELATION
router.post('/relation/:companiesId/:consortiumId', createRelationConsortium);
router.delete('/relation/:companiesId/:consortiumId', deleteRelationConsortium);
export default router;
