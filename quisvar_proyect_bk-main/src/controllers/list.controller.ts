import { Request, Response } from 'express';
import ListServices from '@/services/list.services';
import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { DateOptions } from '@/types/types';
import BiometricAttendanceService from '@/services/attendance/biometricAttendance.service';
import AttendanceListService from '@/services/attendance/attendanceList.service';
import {
  attendanceListActionRequestSchema,
  createAttendanceRequestSchema,
  updateAttendanceBatchRequestSchema,
} from '@/services/attendance/attendance.schema';
import AttendanceBatchService from '@/services/attendance/attendanceBatch.service';

class ListController {
  public static getByUser: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const options = parseQueries<DateOptions>(req.query);
    const query = await ListServices.getByUser(+id, options);
    res.status(200).json(query);
  };
}

export default ListController;

export const createList = async (req: Request, res: Response) => {
  const input = createAttendanceRequestSchema.parse({ body: req.body });
  const actorId = Number(res.locals.userInfo?.id);
  const query = await AttendanceListService.create(input.body, actorId);
  res.status(200).json(query);
};
export const updateAttendanceBatch = async (req: Request, res: Response) => {
  const input = updateAttendanceBatchRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const query = await AttendanceBatchService.update(
    input.params.id,
    Number(res.locals.userInfo?.id),
    input.body
  );
  res.status(200).json(query);
};
export const getCurrentAttendance = async (req: Request, res: Response) => {
  const userId = Number(res.locals.userInfo?.id);
  const query = await AttendanceListService.getCurrentForUser(userId);
  res.status(200).json(query);
};
export const closeBiometricAttendance = async (req: Request, res: Response) => {
  const input = attendanceListActionRequestSchema.parse({ params: req.params });
  const query = await BiometricAttendanceService.close(
    input.params.id,
    Number(res.locals.userInfo?.id)
  );
  res.status(200).json(query);
};
export const finalizeAttendance = async (req: Request, res: Response) => {
  const input = attendanceListActionRequestSchema.parse({ params: req.params });
  const query = await AttendanceListService.finalize(
    input.params.id,
    Number(res.locals.userInfo?.id)
  );
  res.status(200).json(query);
};
export const discardAttendance = async (req: Request, res: Response) => {
  const input = attendanceListActionRequestSchema.parse({
    params: req.params,
  });
  await AttendanceListService.discard(
    input.params.id,
    Number(res.locals.userInfo?.id)
  );
  res.status(204).send();
};
export const getPendingAttendance = async (_req: Request, res: Response) => {
  const query = await ListServices.getPending();
  res.status(200).json(query);
};
export const getAllListByDate = async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const query = await ListServices.getAllListByDate(startDate);
  res.status(200).json(query);
};
export const getListRange = async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const query = await ListServices.getListRange(startDate, endDate);
  res.status(200).json(query);
};
