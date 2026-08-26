import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import { _employee_role, _admin_role } from '@/middlewares/role.middleware';
import {
  deleteFile,
  uploadFile,
  uploadFiles,
} from '@/controllers/files.controllers';
import {
  deleteFilesGeneral,
  deleteUserFile,
  showFilesGeneral,
  updateGeneralDescription,
  uploadBasicFiles,
  uploadFilesGeneral,
  uploadUserFile,
} from '@/controllers/files.controllers';
import uploads from '@/middlewares/upload.middleware';

const router = Router();
// router.get('/download', downloadProfile);
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(_employee_role);
router.post(
  '/uploadFileUser/:id',
  uploads.fileUser.single('fileUser'),
  uploadUserFile
);
router.delete('/removeFileUser/:id/:filename', deleteUserFile);

router.post(
  '/uploadGeneralFiles',
  uploads.generalFiles.single('generalFile'),
  uploadFilesGeneral
);
router.patch('/updateDescription/:id', updateGeneralDescription);
router.get('/generalFiles', showFilesGeneral);
router.delete('/generalFiles/:id', deleteFilesGeneral);
router.post('/upload/:id', uploads.upload.single('file'), uploadFile);
router.post('/uploads/:id', uploads.upload.array('files'), uploadFiles);
router.post(
  '/basics/:id/',
  uploads.basicFiles().array('files'),
  uploadBasicFiles
);
router.delete('/remove/:id', deleteFile);
//ADMIN ROLE

export default router;
