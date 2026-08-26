import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import requireSystemUser from '@/middlewares/systemUser.middleware';
import {
  getAuditByEndpoint,
  getAuditByModule,
  getAuditByStatus,
  getAuditByUser,
  getAuditLogById,
  getAuditSummary,
  listAuditLogs,
} from '@/controllers/auditLog.controllers';
import { getAuditUserOptions } from '@/controllers/userLookup.controllers';

const router = Router();

router.use(authenticateHandler);
router.use(requireSystemUser);

router.get('/stats/summary', getAuditSummary);
router.get('/stats/by-module', getAuditByModule);
router.get('/stats/by-user', getAuditByUser);
router.get('/stats/by-status', getAuditByStatus);
router.get('/stats/by-endpoint', getAuditByEndpoint);
router.get('/users', getAuditUserOptions);
router.get('/', listAuditLogs);
router.get('/:id', getAuditLogById);

export default router;
