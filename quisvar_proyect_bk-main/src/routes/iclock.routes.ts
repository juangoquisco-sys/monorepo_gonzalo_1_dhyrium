import express, { Router } from 'express';
import {
  cdata,
  deviceCommand,
  getRequest,
  registry,
} from '../controllers/iclock.controllers';

const router = Router();

const textBody = () =>
  express.text({
    type: () => true,
    limit: '2mb',
  });

router.all('/registry', textBody(), registry);
router.get('/cdata', cdata);
router.post('/cdata', textBody(), cdata);
router.all('/cdata', textBody(), cdata);
router.get('/getrequest', getRequest);
router.post('/devicecmd', textBody(), deviceCommand);

export default router;
