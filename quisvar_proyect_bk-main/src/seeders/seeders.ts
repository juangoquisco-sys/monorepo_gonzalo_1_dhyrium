import { Profiles, Users } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

// const newUser: Pick<Users, 'role' | 'password' | 'email'>[] = [
//   {
//     role: 'EMPLOYEE',
//     password: '$2a$10$yBo.kWh0whcDmJezWweaPO1SBWaAG4qld5GrtCCGPk4pNeNVkU9gG',
//     email: 'user1@gmail.com',
//   },
//   {
//     role: 'EMPLOYEE',
//     password: '$2a$10$yBo.kWh0whcDmJezWweaPO1SBWaAG4qld5GrtCCGPk4pNeNVkU9gG',
//     email: 'user2@gmail.com',
//   },
//   {
//     role: 'MOD',
//     password: '$2a$10$yBo.kWh0whcDmJezWweaPO1SBWaAG4qld5GrtCCGPk4pNeNVkU9gG',
//     email: 'user3@gmail.com',
//   },
//   {
//     role: 'ADMIN',
//     password: '$2a$10$yBo.kWh0whcDmJezWweaPO1SBWaAG4qld5GrtCCGPk4pNeNVkU9gG',
//     email: 'user4@gmail.com',
//   },
// ];

const newProfile: Pick<
  Profiles,
  'firstName' | 'lastName' | 'dni' | 'userId'
>[] = [
  {
    firstName: 'user1',
    lastName: 'test',
    dni: '01010101',
    userId: 2,
  },
  {
    firstName: 'user2',
    lastName: 'test',
    dni: '01010102',
    userId: 3,
  },
  {
    firstName: 'user3',
    lastName: 'test',
    dni: '01010103',
    userId: 4,
  },
  {
    firstName: 'user4',
    lastName: 'test',
    dni: '01010104',
    userId: 5,
  },
];

// const newProjects: Pick<
//   Projects,
//   | 'name'
//   | 'description'
//   | 'startDate'
//   | 'untilDate'
//   | 'price'
//   | 'workAreaId'
//   | 'userId'
// >[] = [
//   {
//     name: 'project1',
//     description: null,
//     startDate: new Date(),
//     untilDate: new Date(),
//     price: 400.99,
//     workAreaId: 1,
//     userId: 1,
//   },
//   {
//     name: 'project2',
//     description: null,
//     startDate: new Date(),
//     untilDate: new Date(),
//     price: 400.99,
//     workAreaId: 2,
//     userId: 2,
//   },
//   {
//     name: 'project3',
//     description: null,
//     startDate: new Date(),
//     untilDate: new Date(),
//     price: 400.99,
//     workAreaId: 3,
//     userId: 3,
//   },
//   {
//     name: 'project4',
//     description: null,
//     startDate: new Date(),
//     untilDate: new Date(),
//     price: 400.99,
//     workAreaId: 4,
//     userId: 4,
//   },
// ];

// const newTask: Pick<Tasks, 'name' | 'projectId' | 'status'>[] = [
//   {
//     name: 'task1',
//     status: 'UNRESOLVED',
//     projectId: 1,
//   },
//   {
//     name: 'task2',
//     status: 'DONE',
//     projectId: 1,
//   },
//   {
//     name: 'task3',
//     status: 'PROCESS',
//     projectId: 2,
//   },
//   {
//     name: 'task4',
//     projectId: 3,
//     status: 'UNRESOLVED',
//   },
// ];

// const newSubtask: Pick<
//   SubTasks,
//   'name' | 'description' | 'hours' | 'price' | 'taskId'
// >[] = [
//   {
//     name: 'project1',
//     description: null,
//     price: 100.76,
//     hours: 20,
//     taskId: 1,
//   },
//   {
//     name: 'project2',
//     description: null,
//     price: 100.76,
//     hours: 20,
//     taskId: 1,
//   },
//   {
//     name: 'project3',
//     description: null,
//     price: 100.76,
//     hours: 20,
//     taskId: 2,
//   },
//   {
//     name: 'project4',
//     description: null,
//     price: 100.76,
//     hours: 20,
//     taskId: 3,
//   },
// ];

// const createUsers = async () => {
//   await prisma.users.createMany({
//     data: newUser,
//   });
// };

const createProfile = async () => {
  await prisma.profiles.createMany({
    data: newProfile,
  });
};

// const createWorkAreas = async () => {
//   await prisma.workAreas.createMany({
//     data: newWorkAreas,
//   });
// };

// const createProjects = async () => {
//   await prisma.projects.createMany({
//     data: newProjects,
//   });
// };

// const createTask = async () => {
//   await prisma.tasks.createMany({
//     data: newTask,
//   });
// };

// const createSubTask = async () => {
//   await prisma.subTasks.createMany({
//     data: newSubtask,
//   });
// };

// createUsers();
createProfile();
// createWorkAreas();
// createProjects();
// createTask();
// createSubTask();
