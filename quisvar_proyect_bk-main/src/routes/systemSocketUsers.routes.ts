import { Router } from 'express';
import { getSystemSocketUsers } from '@/controllers/systemSocketUsers.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import requireSystemUser from '@/middlewares/systemUser.middleware';

const router = Router();

router.use(authenticateHandler);
router.use(requireSystemUser);

router.get('/', getSystemSocketUsers);

export default router;
