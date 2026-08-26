import { axiosInstance } from '@/services/axiosInstance';
import type {
  MeetingProjectFocus,
  MeetingUnitsOverview,
} from '../types/meetingUnitProjects.types';

export const getMeetingUnitsOverview = async () => {
  const res = await axiosInstance.get<MeetingUnitsOverview>(
    '/meeting-units/overview'
  );
  return res.data;
};

export const getMeetingUnitProjects = async (unitId: string) => {
  const res = await axiosInstance.get<MeetingProjectFocus[]>(
    `/meeting-units/${unitId}/projects`
  );
  return res.data;
};
