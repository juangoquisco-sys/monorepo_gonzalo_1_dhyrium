import { axiosInstance } from '@/services/axiosInstance';
import type {
  AttendanceCallConfig,
  AttendanceCallWeekdayOverride,
  AttendanceWeekday,
  UpsertCallConfigInput,
  UpsertWeekdayOverrideInput,
} from '../attendanceCallConfig.types';

export const attendanceCallConfigService = {
  async list() {
    const { data } = await axiosInstance.get<AttendanceCallConfig[]>(
      '/attendance-call-config'
    );
    return data;
  },
  async upsert(position: number, input: UpsertCallConfigInput) {
    const { data } = await axiosInstance.put<AttendanceCallConfig>(
      `/attendance-call-config/${position}`,
      input
    );
    return data;
  },
  async remove(id: number) {
    await axiosInstance.delete(`/attendance-call-config/${id}`);
  },
  async upsertWeekdayOverride(
    callConfigId: number,
    weekday: AttendanceWeekday,
    input: UpsertWeekdayOverrideInput
  ) {
    const { data } = await axiosInstance.put<AttendanceCallWeekdayOverride>(
      `/attendance-call-config/${callConfigId}/weekday-overrides/${weekday}`,
      input
    );
    return data;
  },
  async removeWeekdayOverride(id: number) {
    await axiosInstance.delete(`/attendance-call-config/weekday-overrides/${id}`);
  },
};
