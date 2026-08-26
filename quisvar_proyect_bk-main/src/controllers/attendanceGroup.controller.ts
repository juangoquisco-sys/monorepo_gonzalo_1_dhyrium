import { ControllerFunction } from '@/types/patterns';
import AttendanceGroupService from '@/services/attendanceGroup.services';
import { FilesProps } from '@/types/types';
import AppError from '@/utils/appError';

class AttendanceGroupController {
  public getUsersGroup: ControllerFunction = async (req, res) => {
    const { groupId } = req.params;
    const query = await AttendanceGroupService.getUsersGroup(+groupId);
    res.status(200).json(query);
  };
  //Group List
  public createList: ControllerFunction = async (req, res, next) => {
    try {
      const { body } = req;
      const { id, date } = req.query;
      const query = await AttendanceGroupService.createList(
        body,
        Number(id),
        date as string
      );
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  // public editTitle: ControllerFunction = async (req, res, next) => {
  //   try {
  //     const { id } = req.params;
  //     const { title } = req.body;
  //     const query = await AttendanceGroupService.editTitle(+id, title);
  //     res.status(200).json(query);
  //   } catch (error) {
  //     console.log(error);
  //     next(error);
  //   }
  // };
  public getList: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
    const query = await AttendanceGroupService.getList(date as string, +id);
    res.status(200).json(query);
  };
  // public getHistory: ControllerFunction = async (req, res, next) => {
  //   try {
  //     const { id, startDate, endDate } = req.query;
  //     const query = await AttendanceGroupService.getHistory(
  //       +(id as string),
  //       startDate as string,
  //       endDate as string
  //     );
  //     res.status(200).json(query);
  //   } catch (error) {
  //     next(error);
  //   }
  // };
  public deleteListAttendance: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await AttendanceGroupService.deleteList(+id);
    res.status(200).json(query);
  };
  //Group List File
  public updateListFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { file } = req.files as FilesProps;
    const doc = file ? file[0].filename : '';
    const query = await AttendanceGroupService.updateListFile(doc, +id);
    res.status(201).json(query);
  };
  public deleteListFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await AttendanceGroupService.deleteListFile(+id);
    res.status(200).json(query);
  };
  //Attendance Group
  // public createAttendance: ControllerFunction = async (req, res, next) => {
  //   try {
  //     const { body } = req;
  //     const query = await AttendanceGroupService.create(body);
  //     res.status(201).json(query);
  //   } catch (error) {
  //     next(error);
  //   }
  // };
  // public updateAttendance: ControllerFunction = async (req, res, next) => {
  //   try {
  //     const { id } = req.params;
  //     const { body } = req;
  //     const query = await AttendanceGroupService.update(+id, body);
  //     res.status(200).json(query);
  //   } catch (error) {
  //     next(error);
  //   }
  // };
  //Disabled Users
  public disabledUser: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const query = await AttendanceGroupService.disabledGroup(+id, status);
    res.status(200).json(query);
  };
  //Attendance File
  public updateFile: ControllerFunction = async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!req.file)
        throw new AppError('Oops!, no se pudo subir el contrato', 400);
      // const { file } = req.files as FilesProps;
      // console.log(file)
      // const pdf = file ?  file[0].filename : ''
      // console.log(pdf)
      const query = await AttendanceGroupService.updateFile(
        +id,
        req.file.filename
      );
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public deleteFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await AttendanceGroupService.deleteFile(+id);
    res.status(200).json(query);
  };
}
export default new AttendanceGroupController();
