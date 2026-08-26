import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import {
  assignProductionBonus,
  getProductionBonus,
  getProductionBonusSummary,
  liquidateProductionBonus,
  regularizeProductionBonus,
  updateProductionBonusStatus,
  validateProductionBonus,
} from '@/controllers/productionBonus.controllers';
import { getProductionBonusUserOptions } from '@/controllers/userLookup.controllers';

const router = Router();

router.use(authenticateHandler);
router.use(role.RoleHandler(['MOD', 'USER'], 'tramites', 'bono-produccion'));
router.get('/', getProductionBonus);
router.get('/summary', getProductionBonusSummary);
router.post('/regularize', regularizeProductionBonus);

router.use(role.RoleHandler(['MOD'], 'tramites', 'bono-produccion'));
router.get('/users', getProductionBonusUserOptions);
router.post('/assign', assignProductionBonus);
router.patch('/status/:id', updateProductionBonusStatus);
router.patch('/validate/:id', validateProductionBonus);
router.patch('/liquidate/:id', liquidateProductionBonus);

export default router;
