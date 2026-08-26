import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import uploads from '@/middlewares/upload.middleware';
import AttendanceGroupControllers from '@/controllers/attendanceGroup.controller';
class AttendanceGroupRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  protected setUpRouter(): void {
    this.router.use(authenticateHandler);
    // this.router.use(role.mod);
    this.router.get(
      '/users/:groupId',
      AttendanceGroupControllers.getUsersGroup
    );
    //Filter
    // this.router.get('/filter', AttendanceGroupControllers.getHistory);
    //Group List
    this.router.post('/list', AttendanceGroupControllers.createList);
    // this.router.patch('/list/title/:id', AttendanceGroupControllers.editTitle);
    this.router.get('/list/:id', AttendanceGroupControllers.getList);
    this.router.delete(
      '/list/:id',
      AttendanceGroupControllers.deleteListAttendance
    );
    //Group List File
    this.router.patch(
      '/list/file/:id',
      uploads.fileGroup.array('file'),
      AttendanceGroupControllers.updateListFile
    );
    this.router.delete(
      '/list/file/:id',
      AttendanceGroupControllers.deleteListFile
    );
    //Attendance Group
    // this.router.post('/relation', AttendanceGroupControllers.createAttendance);
    // this.router.patch('/:id', AttendanceGroupControllers.updateAttendance);
    //Disabled Users
    this.router.patch('/disabled/:id', AttendanceGroupControllers.disabledUser);
    //Attendance File
    this.router.patch(
      '/file/:id',
      uploads.fileGroup.single('file'),
      AttendanceGroupControllers.updateFile
    );
    this.router.delete('/file/:id', AttendanceGroupControllers.deleteFile);
  }
}
const { router } = new AttendanceGroupRoutes();
export default router;
