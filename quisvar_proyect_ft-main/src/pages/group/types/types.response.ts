export type GroupRes = {
  id: number;
  nombre: string;
  groupId: number;
  title?: string;
  file?: string;
  createdAt: string | Date;
  groups: {
    name: string;
    gNumber: number;
    moderator: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  // attendance: GroupAttendanceRes[];
  duty: Duty[];
};
export type DutyBasic = Pick<Duty, 'id' | 'CUI' | 'project' | 'shortName'>;

export type GroupAttendanceRes = {
  id: number;
  // description: string;
  status: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
};
export type GroupUsersRes = {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  description?: string;
};
// export type Duty = {
//   id: number;
//   listId: number;
//   fullName?: string;
//   description?: string;
//   startDate?: Date | string;
//   untilDate?: Date | string;
//   createdAt?: Date | string;
// };
export type Duty = {
  id: number;
  CUI: string;
  project: string;
  shortName: string;
  titleMeeting?: string;
  dutyGroup?: string;
  dutyGroupDate?: string;
  members: DutyMember[];
  listId: number;
  createdAt?: Date | string;
};
export type DutyMember = {
  id?: number;
  position?: string;
  fullName: string;
  task: DutyTasks[];
  feedBack?: string;
  feedBackDate?: string;
  dailyDuty?: string;
  dailyDutyDate?: string;
  attendance?: string;
  dutyId: number;
};

export type DutyTasks = {
  id: number;
  name?: string;
  percentage?: number;
  dutyMemberId: number;
};
export interface Days {
  day: string;
  date: string;
  members: {
    fullName: string;
    tasks: DutyTasks[];
  }[];
}
// interface Profile {
//   firstName: string;
//   lastName: string;
//   dni: string;
//   description: string | null;
// }

interface User {
  firstName: string;
  lastName: string;
}

interface Task {
  name: string;
  status: string;
  updatedAt: Date;
  days: number;
  user: User;
  stage: string;
  stageId: number;
  project: string;
  projectId: number;
  subTask: string;
  item: string;
}

export interface DayTasks {
  day: string;
  date: string;
  tasks: Task[];
}
export interface GroupSeletRes {
  id: number;
  name: string;
}
export interface DivisionLeaderRes {
  id: number;
  name: string;
  leaders: {
    profile: {
      id: number;
      firstName: string;
      lastName: string;
    };
  }[];
}
