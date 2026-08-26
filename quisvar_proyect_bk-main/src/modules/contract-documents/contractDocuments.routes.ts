import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import ContractDocumentsController from './contractDocuments.controller';

const router = Router();

router.use(authenticateHandler);
router.use(role.RoleHandler(['MOD'], 'indice-general'));
router.get('/scopes', ContractDocumentsController.scopes);
router.get('/contracts', ContractDocumentsController.contracts);
router.get('/contracts/count', ContractDocumentsController.count);
router.get('/contracts/:contractId', ContractDocumentsController.contract);
router.get('/contracts/:contractId/tree', ContractDocumentsController.tree);
router.post(
  '/contracts/:contractId/nodes/:levelCode/attachments',
  ContractDocumentsController.attach
);
router.post(
  '/contracts/:contractId/nodes/:levelCode/edit-source',
  ContractDocumentsController.editSource
);
router.post(
  '/contracts/:contractId/nodes/:levelCode/replacements',
  ContractDocumentsController.replace
);
router.get(
  '/contracts/:contractId/nodes/:levelCode/download',
  ContractDocumentsController.download
);
router.delete(
  '/contracts/:contractId/nodes/:levelCode/attachments/current',
  ContractDocumentsController.remove
);

export default router;
