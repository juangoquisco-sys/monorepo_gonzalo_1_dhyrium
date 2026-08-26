import { Router } from 'express';
import { getSystemHealth } from '@/controllers/systemHealth.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import requireSystemUser from '@/middlewares/systemUser.middleware';

const router = Router();

router.use(authenticateHandler);
router.use(requireSystemUser);

router.get('/', getSystemHealth);

export default router;
