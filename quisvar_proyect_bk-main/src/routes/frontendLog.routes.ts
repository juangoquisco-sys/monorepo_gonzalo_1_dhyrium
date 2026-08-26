import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import requireSystemUser from '@/middlewares/systemUser.middleware';
import {
  getFrontendLogEventById,
  getFrontendLogSummary,
  ingestFrontendLogBatch,
  listFrontendLogEvents,
} from '@/controllers/frontendLog.controllers';
import { getFrontendLogUserOptions } from '@/controllers/userLookup.controllers';

const router = Router();

router.use(authenticateHandler);
router.post('/batch', ingestFrontendLogBatch);

router.use(requireSystemUser);
router.get('/stats/summary', getFrontendLogSummary);
router.get('/users', getFrontendLogUserOptions);
router.get('/events', listFrontendLogEvents);
router.get('/events/:id', getFrontendLogEventById);

export default router;
