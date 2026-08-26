import type { OptionSelect } from '@/types/option.types';

export interface TaskForReviewQUery {
  project: string;
  stage: string;
  status: string;
  initialDate: string;
  untilDate: string;
  userId: string;
}

export interface OfficeUsers {
  id: number;
  officeName: string;
  users: OfficeUser[];
}

export type OfficeUsersSelect = OptionSelect & OfficeUsers;

export interface OfficeUser {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  groupName: string;
}
