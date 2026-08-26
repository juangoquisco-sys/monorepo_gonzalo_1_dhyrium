import { axiosInstance } from '@/services/axiosInstance';
import type { AttendanceRange } from '@/types/types';
import type {
  AttendanceBatchChange,
  AttendanceBatchResponse,
  AttendanceCaptureMode,
  AttendanceList,
  CurrentAttendance,
  PendingAttendance,
} from './attendance.types';

export const attendanceService = {
  async getLists(startDate: string) {
    const { data } = await axiosInstance.get<AttendanceList[]>(
      '/list/attendance',
      { params: { startDate }, headers: { noLoader: true } }
    );
    return data;
  },
  async create(input: {
    title: string;
    timer: string;
    captureMode: AttendanceCaptureMode;
  }) {
    const { data } = await axiosInstance.post<{ id: number }>('/list', input);
    return data;
  },
  async closeBiometric(listId: number) {
    const { data } = await axiosInstance.post(`/list/${listId}/close`);
    return data;
  },
  async discard(listId: number) {
    await axiosInstance.delete(`/list/${listId}`);
  },
  async getRange(startDate: string, endDate: string) {
    const { data } = await axiosInstance.get<AttendanceRange[]>(
      '/list/attendance/range',
      {
        params: { startDate, endDate },
      }
    );
    return data;
  },
  async getCurrentAttendance() {
    const { data } = await axiosInstance.get<CurrentAttendance>(
      '/list/attendance/current',
      { headers: { noLoader: true } }
    );
    return data;
  },
  async updateBatch(
    listId: number,
    batchId: string,
    changes: AttendanceBatchChange[]
  ) {
    const { data } = await axiosInstance.patch<AttendanceBatchResponse>(
      `/list/${listId}/attendance/batch`,
      { batchId, changes },
      { headers: { noLoader: true } }
    );
    return data;
  },
  async finalize(listId: number) {
    const { data } = await axiosInstance.post(`/list/${listId}/finalize`, {});
    return data;
  },
  async getPendingAttendance() {
    const { data } = await axiosInstance.get<PendingAttendance | null>(
      '/list/pending',
      { headers: { noLoader: true } }
    );
    return data;
  },
};
