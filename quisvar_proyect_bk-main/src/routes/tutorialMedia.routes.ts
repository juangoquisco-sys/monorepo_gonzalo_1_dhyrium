import { Router } from 'express';
import role from '@/middlewares/role.middleware';
import { authenticateTutorialMediaTicket } from '@/middlewares/tutorialMedia.middleware';
import {
  sendFile,
  sendMaterial,
  sendThumbnail,
} from '@/controllers/tutorialMedia.controller';

const router = Router();

router.use(authenticateTutorialMediaTicket);
router.use(role.RoleHandler(['MOD', 'VIEWER'], 'tutorials'));
router.get('/video/:id', sendFile);
router.get('/thumbnail/:id', sendThumbnail);
router.get('/material/:id', sendMaterial);

export default router;
