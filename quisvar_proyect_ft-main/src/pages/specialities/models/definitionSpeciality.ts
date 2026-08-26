import { UserType } from '@/types/userType';
import type { SubTask } from '@/types/types';
import { TaskStatus } from '../pages/project/models/definitiosProject';

export const YEAR_DATA = [
  {
    year: 2017,
  },
  {
    year: 2018,
  },
  {
    year: 2019,
  },
  {
    year: 2020,
  },
  {
    year: 2021,
  },
  {
    year: 2022,
  },
  {
    year: 2023,
  },
  {
    year: 2024,
  },
  {
    year: 2025,
  },
  {
    year: 2026,
  },
  {
    year: 2027,
  },
  {
    year: 2028,
  },
  {
    year: 2029,
  },
  {
    year: 2030,
  },
  {
    year: 2031,
  },
  {
    year: 2032,
  },
  {
    year: 2033,
  },
  {
    year: 2034,
  },
  {
    year: 2035,
  },
  {
    year: 2036,
  },
  {
    year: 2037,
  },
  {
    year: 2038,
  },
  {
    year: 2039,
  },
  {
    year: 2040,
  },
  {
    year: 2041,
  },
  {
    year: 2042,
  },
  {
    year: 2043,
  },
  {
    year: 2044,
  },
  {
    year: 2045,
  },
  {
    year: 2046,
  },
  {
    year: 2047,
  },
  {
    year: 2048,
  },
  {
    year: 2049,
  },
];

export const TASK_TEMPLATE: SubTask = {
  id: 0,
  status: TaskStatus.UNRESOLVED,
  isFake: true,
  managerGroup: [],
  name: '',
  feedBacks: [],
  percentage: 0,
  description: '',
  price: '',
  days: 0,
  files: {
    MODEL: [],
    UPLOADS: [],
    REVIEW: [],
  },
  taskId: 0,
  indexTaskId: 0,

  participantSummary: [],
  users: {
    ACTIVE: undefined,
  },
  mods: [],
  Levels: {
    userId: 0,
    stages: {
      group: {
        id: 0,
        name: '',
        groups: [],
        moderator: {
          id: 0,
          email: '',
          password: '',
          isSystemUser: false,
          profile: {
            id: 0,
            degree: 'Practicante',
            description: '',
            job: {
              abrv: '',
              amount: 0,
              value: '',
              label: '',
            },
            firstName: '',
            firstNameRef: '',
            lastNameRef: '',
            phoneRef: '',
            addressRef: '',
            lastName: '',
            dni: '',
            phone: '',
            userPc: '',
            userId: 0,
            department: '',
            province: '',
            district: '',
            room: '',
            gender: '',
          },
          role: null,
          roleId: 0,
          contract: null,
          cv: null,
          declaration: null,
          isAccessReception: false,
          offices: [],
          withdrawalDeclaration: null,
          ruc: '',
          address: '',
          userType: UserType.INTERINO,
        },
        gNumber: 0,
      },
      id: 0,
      name: '',
      _count: {
        levels: 0,
      },
      startDate: '',
      untilDate: '',
    },
  },
  lastFeedback: {
    id: 0,
    comment: '',
    author: '',
    reviewer: '',
    type: undefined,
    status: false,
    createdAt: '',
    updatedAt: '',
    percentage: 0,
    subTasksId: 0,
    files: [],
    users: [],
  },
  percentageWithoutActive: 0,
};
