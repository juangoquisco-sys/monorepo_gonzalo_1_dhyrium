/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BasicTasks,
  DutyTasks,
  Levels,
  Profiles,
  Projects,
  Stages,
  SubTasks,
  TaskRole,
} from '@prisma/client';
import {
  BasicTaskFilter,
  DegreeList,
  DegreeTypes,
  GetBasicLevelStage,
  GetFilterLevels,
  Level,
  LevelBasic,
  ListCostType,
  ObjectAny,
  ObjectNumber,
  PickSubtask,
  ProjectDir,
  SubTaskFilter,
  UpdateLevelBlock,
  User,
  usersCount,
} from '@/types/types';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import PathServices from '@/services/paths.services';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import { ENV } from '@/config/env';
import { StagePricingOption } from '@/types/stages';
import Utilities from '@/utils/utilities';

export const URL_HOST = `http://${ENV.HOST}:${ENV.PORT}`;

export const sumValues = (list: any[], label: string) => {
  const sum = list.reduce((a: number, c) => a + +c[label], 0);
  if (Number.isNaN(sum)) return 0;
  return Math.round(sum * 100) / 100;
};

export const parseSubTasks = (
  listSubtask: PickSubtask[],
  _percentage: number
) => {
  return listSubtask.map(subtask => {
    const percentage = sumValues(subtask.users, 'percentage');
    const spending =
      subtask.status === 'LIQUIDATION'
        ? subtask.price
        : subtask.status === 'DONE'
        ? parseFloat(((+subtask.price * _percentage) / 100).toFixed(2))
        : 0;
    const balance = +subtask.price - +spending;
    return {
      percentage,
      spending,
      balance,
      ...subtask,
    };
  });
};
export const round2Decimal = (n: number, decimal: number = 2) => {
  const aux = Math.pow(10, decimal);
  return Math.round((n / 30) * aux) / aux;
};
export const roundTwoDecimail = (n: number, decimal: number = 2) => {
  const aux = Math.pow(10, decimal);
  return Math.round(n * aux) / aux;
};
const calculateCost = (percentage: number, cost?: number) => {
  const price = ((cost ? cost : 1) * percentage) / 100;
  return Math.round(price * 100) / 100;
};

export const percentageSubTasks = (
  task: SubTaskFilter[],
  priceTask?: ListCostType
) => {
  return task.map(({ users, ...subtask }) => {
    const percentage = sumValues(users, 'percentage');
    const list = users.map(({ userId }) => userId);
    const listUsers: usersCount[] = list.reduce(
      (acc: typeof listUsers, userId) => {
        const existingItem = acc.find(item => item.userId === userId);
        if (existingItem) {
          existingItem.count++;
        } else {
          const findUser = users.find(u => u.userId === userId);
          const firstName = findUser?.user?.profile?.firstName;
          const lastName = findUser?.user?.profile?.lastName;
          const dni = findUser?.user?.profile?.dni;
          const degree = findUser?.user?.profile?.degree || undefined;
          const percentage = findUser?.percentage || 0;
          acc.push({
            userId,
            count: 1,
            firstName,
            lastName,
            dni,
            degree,
            percentage,
          });
        }
        return acc;
      },
      []
    );
    //----------------------------- Calculate - Cost-----------------------
    const newCost = listUsers.map(user => {
      if (user.degree === 'Practicante') {
        return { total: calculateCost(100, priceTask?.intern) };
      }
      if (user.degree === 'Egresado') {
        return { total: calculateCost(100, priceTask?.graduate) };
      }
      if (user.degree === 'Bachiller') {
        return { total: calculateCost(100, priceTask?.bachelor) };
      }
      return { total: calculateCost(100, priceTask?.professional) };
    });
    const totalCostPerUser = sumValues(newCost, 'total');
    //--------------------------------------------------------------------
    const price =
      Math.round(
        (totalCostPerUser
          ? totalCostPerUser * subtask.days
          : priceTask?.cost
          ? priceTask.cost * subtask.days
          : 0) * 100
      ) / 100;
    //--------------------------------------------------------------------
    const spending = Math.round(price * percentage) / 100;
    const balance = Math.round(+price - +spending) / 100;
    //--------------------------------------------------------------------
    return {
      percentage,
      spending,
      balance,
      listUsers,
      users,
      ...subtask,
      price,
    };
  });
};

// const pricePerUser = (users: usersCount[], priceTask?: ListCostType) => {
//   const newCost = users.map(user => {
//     if (!priceTask || !priceTask[user.degree as keyof ListCostType])
//       return { total: 0 };
//     const total = calculateCost(
//       user.percentage,
//       priceTask[user.degree as keyof ListCostType]
//     );
//     return { total };
//   });
//   return newCost;
// };

const detailsPerUser = (list: number[], users: BasicTaskFilter['users']) => {
  const listUser: usersCount[] = users.reduce<usersCount[]>((acc, user) => {
    const findUser = acc.find(u => u.userId === user.userId);
    if (findUser) {
      findUser.count++;
      findUser.percentage += user.percentage;
    } else {
      const percentage = user.percentage || 0;
      const userId = user.userId;
      const profile = user.user?.profile;
      const data = profile
        ? {
            firstName: profile.firstName,
            lastName: profile.lastName,
            dni: profile.dni,
            degree: profile.degree,
          }
        : {};
      acc.push({ count: 1, percentage, userId, ...data });
    }
    return acc;
  }, []);
  return listUser;
};

export const dataWithLevel = {
  spending: 0,
  balance: 0,
  price: 0,
  days: 0,
  listUsers: [] as usersCount[],
  percentage: 0,
  total: 0,
  // subTasks: [] as percentageTaskFilter[],
};

export const percentageTasks = (
  listSubtask: BasicTaskFilter[],
  item: string,
  // { unique }: { priceTask?: ListCostType; unique: boolean }
  // { unique, priceTask }: { priceTask?: number; unique: boolean }
  {
    unique,
    monthlyPrice: monthly_price,
    stayPrice: stay_price,
  }: StagePricingOption & { unique: boolean }
) => {
  const subtasks = listSubtask.map(({ users, ...subtask }) => {
    const findItem = numberToConvert(subtask.index, subtask.typeItem);
    const newItem = unique ? item : item + (item ? '.' : '') + findItem;
    const percentage = sumValues(users, 'percentage');
    const listUsers = detailsPerUser(
      users.map(user => user.userId),
      users
    );
    const percentagePayment = users.reduce<number>((acc, u) => {
      return acc + (u.statusPayment ? u.percentage / 100 : 0);
      // return acc;
    }, 0);
    //----------------------------- Calculate - Cost-----------------------
    const price = Utilities.roundDecimal(monthly_price * subtask.days, 4);
    const stayPrice = Utilities.roundDecimal(stay_price * subtask.days, 4);
    const spending = Utilities.roundDecimal(percentagePayment * price, 4);
    const balance = price - spending;
    return {
      percentage,
      spending,
      balance,
      listUsers,
      ...subtask,
      item: newItem,
      stayPrice,
      price,
    };
  });
  const price = sumValues(subtasks, 'price');
  const stayPrice = sumValues(subtasks, 'stayPrice');
  const days = sumValues(subtasks, 'days');
  const spending = sumValues(subtasks, 'spending');
  const percentage = sumValues(subtasks, 'percentage');
  const total = subtasks.length;
  //---------------------------------------------------------------------
  const list = subtasks.map(({ listUsers }) => listUsers).flat(2);
  const balance = roundTwoDecimail(price - spending);
  const listUsers = list.reduce<typeof list>(
    (acc, { count, userId, percentage, ...data }) => {
      const exist = acc.findIndex(u => u.userId === userId);
      if (exist >= 0) {
        acc[exist].percentage += percentage;
        acc[exist].count += count;
      } else {
        acc.push({ userId, count, percentage, ...data });
      }
      return acc;
    },
    []
  );
  const info = { price, stayPrice, days, spending, percentage, total, balance };
  return { ...info, subTasks: subtasks, listUsers };
};

export const getDetailsSubtask = (listSubtask: PickSubtask[], list?: any[]) => {
  const UNRESOLVED = quantityTaskByStatus(listSubtask, 'UNRESOLVED', list);
  const PROCESS = quantityTaskByStatus(listSubtask, 'PROCESS', list);
  const INREVIEW = quantityTaskByStatus(listSubtask, 'INREVIEW', list);
  const DENIED = quantityTaskByStatus(listSubtask, 'DENIED', list);
  const DONE = quantityTaskByStatus(listSubtask, 'DONE', list);
  const LIQUIDATION = quantityTaskByStatus(listSubtask, 'LIQUIDATION', list);
  const listTaskLength = list?.map(t => t.subTasks).flat().length || 0;
  const TOTAL = listSubtask.length + listTaskLength;
  return { UNRESOLVED, PROCESS, INREVIEW, DENIED, DONE, LIQUIDATION, TOTAL };
};

export const getQuantityDetail = (list: any[]) => {
  const UNRESOLVED = quantityTaskByArea('UNRESOLVED', list);
  const PROCESS = quantityTaskByArea('PROCESS', list);
  const INREVIEW = quantityTaskByArea('INREVIEW', list);
  const DENIED = quantityTaskByArea('DENIED', list);
  const DONE = quantityTaskByArea('DONE', list);
  const LIQUIDATION = quantityTaskByArea('LIQUIDATION', list);
  const TOTAL = UNRESOLVED + PROCESS + INREVIEW + DENIED + DONE + LIQUIDATION;
  return { UNRESOLVED, PROCESS, INREVIEW, DENIED, DONE, LIQUIDATION, TOTAL };
};

export const countSubTask = (listSubtask: PickSubtask[], status: TaskRole) => {
  return listSubtask.filter(s => s.status === status).length;
};
const quantityTaskByStatus = (
  listSubtask: PickSubtask[],
  status: TaskRole,
  listTask: any[] | undefined
) => {
  const total_quantity: number =
    (listTask && listTask.reduce((a, c) => a + c.taskInfo[status], 0)) || 0;
  return countSubTask(listSubtask, status) + total_quantity;
};

const quantityTaskByArea = (status: TaskRole, listTask: any[] | undefined) => {
  const total_quantity: number =
    (listTask && listTask.reduce((a, c) => a + c.taskInfo[status], 0)) || 0;
  return total_quantity;
};

export const calculateAndUpdateDataByLevel = (levels: Level[]) => {
  levels.forEach(level => {
    level.balance = calculateSumTotal(level, 'balance');
    level.spending = calculateSumTotal(level, 'spending');
    level.price = calculateSumTotal(level, 'price');
    level.days = calculateSumTotal(level, 'days');
    level.total = calculateSumTotal(level, 'total');
    level.listUsers = calculateQuantityUser(level, 'listUsers');
    level.percentage =
      calculateSumTotal(level, 'percentage') / level.total || 0;
    if (level.nextLevel && level.nextLevel.length > 0) {
      calculateAndUpdateDataByLevel(level.nextLevel);
    }
  });
  return levels;
};

export const calculateDataByBasicLevel = (levels: LevelBasic[]) => {
  levels.forEach(level => {
    level.balance = calculateBasicSumTotal(level, 'balance');
    level.spending = calculateBasicSumTotal(level, 'spending');
    level.price = calculateBasicSumTotal(level, 'price');
    level.days = calculateBasicSumTotal(level, 'days');
    level.total = calculateBasicSumTotal(level, 'total');
    level.listUsers = calculateQuantityUser2(level, 'listUsers');
    level.percentage =
      calculateBasicSumTotal(level, 'percentage') / level.total || 0;
    if (level.nextLevel && level.nextLevel.length > 0) {
      calculateDataByBasicLevel(level.nextLevel);
    }
  });
  return levels;
};

const calculateSumTotal = (
  level: Level,
  type: keyof Level
  // subType: keyof Details | null
) => {
  let sumaBalance = level[type] as number;
  // if (subType && type === 'details') sumaBalance = level[type][subType];
  if (level.nextLevel && level.nextLevel.length > 0) {
    for (const subLevel of level.nextLevel) {
      sumaBalance += calculateSumTotal(subLevel, type);
    }
  }
  return roundTwoDecimail(sumaBalance);
};

export const calculateBasicSumTotal = (
  level: LevelBasic,
  type: keyof LevelBasic
) => {
  let sumaBalance = level[type] as number;
  if (level.nextLevel && level.nextLevel.length > 0) {
    for (const subLevel of level.nextLevel) {
      sumaBalance += calculateBasicSumTotal(subLevel, type);
    }
  }
  return roundTwoDecimail(sumaBalance);
};

const calculateQuantityUser = (level: Level, type: keyof Level) => {
  let sumListUsers = level[type] as usersCount[];
  if (level.nextLevel && level.nextLevel.length > 0) {
    const list: typeof level.listUsers = level.nextLevel
      .map(l => calculateQuantityUser(l, type))
      .flat(2);
    const listUsers = list.reduce(
      (acc: typeof list, { count, userId, ...data }) => {
        const exist = acc.findIndex(u => u.userId === userId);
        exist >= 0
          ? (acc[exist].count += count)
          : acc.push({ userId, count, ...data });
        return acc;
      },
      []
    );
    return listUsers;
  }
  return sumListUsers;
};

export const calculateQuantityUser2 = (
  level: LevelBasic,
  type: keyof LevelBasic
) => {
  let sumListUsers = level[type] as usersCount[];
  if (level.nextLevel && level.nextLevel.length > 0) {
    const list: typeof level.listUsers = level.nextLevel
      .map(l => calculateQuantityUser2(l, type))
      .flat(2);
    const listUsers = list.reduce(
      (acc: typeof list, { count, userId, ...data }) => {
        const exist = acc.findIndex(u => u.userId === userId);
        exist >= 0
          ? (acc[exist].count += count)
          : acc.push({ userId, count, ...data });
        return acc;
      },
      []
    );
    return listUsers;
  }
  return sumListUsers;
};

export const initialProfile = {
  firstName: '',
  lastName: '',
};

// export const LEVEL_DATA: Level = {
//   id: 0,
//   item: '',
//   name: '',
//   rootId: 0,
//   spending: 0,
//   balance: 0,
//   price: 0,
//   level: 0,
//   rootLevel: 0,
//   stagesId: 0,
//   isInclude: false,
//   isArea: false,
//   isProject: false,
//   userId: null,
//   // details: {
//   //   UNRESOLVED: 0,
//   //   PROCESS: 0,
//   //   INREVIEW: 0,
//   //   DENIED: 0,
//   //   DONE: 0,
//   //   LIQUIDATION: 0,
//   //   TOTAL: 0,
//   // },
// };
export const getRootPath = async (id: number) => {
  if (!id) throw new AppError('Oops!, ID invalido', 400);
  const findLevel = await prisma.levels.findUnique({ where: { id } });
  if (!findLevel) throw new AppError('No se pudieron encontrar el nivel', 404);
  const { item, ...level } = findLevel;
  const rootPath = await existRootLevelPath(
    findLevel.rootId,
    findLevel.stagesId
  );
  return { rootPath, _item: item, ...level };
};

export const existRootLevelPath = async (rootId: number, stagesId: number) => {
  const rootPath = rootId
    ? await PathServices.level(rootId)
    : await PathServices.stage(stagesId, 'UPLOADS');
  if (!existsSync(rootPath)) throw new AppError('Ops!,carpeta no existe', 404);
  return rootPath;
};

export const getRootItem = (item: string) => {
  const values = item.split('.').filter(v => v.length);
  const rootItem = values.slice(0, -1).join('.');
  const lastItem = values.at(-1) || '';
  return { rootItem, lastItem };
};

export const parseRootItem = (item: string, i: number) => {
  const { rootItem, lastItem } = getRootItem(item);
  const index = +lastItem + i;
  const newRootItem = rootItem ? rootItem + '.' : '';
  const newItem = newRootItem + index + '.';
  return newItem;
};
export const filterLevelList = (
  rootList: UpdateLevelBlock[],
  _rootId: number,
  _rootLevel: number
) => {
  const findList = rootList.filter(
    ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
  );
  const list = rootList.filter(value => !findList.includes(value));
  return { findList, list };
};

export const getFilterListLevels = (
  rootList: GetFilterLevels[],
  _rootId: number,
  _rootLevel: number
) => {
  const findList = rootList.filter(
    ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
  );
  const list = rootList.filter(value => !findList.includes(value));
  return { findList, list };
};

export const sumSubtaksByStage = (
  list: (Levels & {
    subTasks: SubTasks[];
  })[]
) => {
  const totalvalues = list.map(level => {
    const UNRESOLVED = level.subTasks.filter(
      ({ status }) => status === 'UNRESOLVED'
    ).length;
    const PROCESS = level.subTasks.filter(
      ({ status }) => status === 'PROCESS'
    ).length;
    const INREVIEW = level.subTasks.filter(
      ({ status }) => status === 'INREVIEW'
    ).length;
    const DENIED = level.subTasks.filter(
      ({ status }) => status === 'DENIED'
    ).length;
    const DONE = level.subTasks.filter(
      ({ status }) => status === 'DONE'
    ).length;
    const LIQUIDATION = level.subTasks.filter(
      ({ status }) => status === 'LIQUIDATION'
    ).length;
    return { UNRESOLVED, PROCESS, INREVIEW, DENIED, DONE, LIQUIDATION };
  });
  const UNRESOLVED = sumValues(totalvalues, 'UNRESOLVED');
  const PROCESS = sumValues(totalvalues, 'PROCESS');
  const INREVIEW = sumValues(totalvalues, 'INREVIEW');
  const DENIED = sumValues(totalvalues, 'DENIED');
  const DONE = sumValues(totalvalues, 'DONE');
  const LIQUIDATION = sumValues(totalvalues, 'LIQUIDATION');
  return { UNRESOLVED, PROCESS, INREVIEW, DENIED, DONE, LIQUIDATION };
};

export const sumPriceByStage = (
  list: (Levels & {
    subTasks: SubTasks[];
  })[]
) => {
  const totalvalues = list.map(level => {
    const price = sumValues(level.subTasks, 'price');
    const days = sumValues(level.subTasks, 'days');
    const spending = sumValues(level.subTasks, 'spending');
    const balance = price - spending;
    return { price, spending, balance, days };
  });
  const price = sumValues(totalvalues, 'price');
  const days = sumValues(totalvalues, 'days');
  const spending = sumValues(totalvalues, 'spending');
  const balance = price - spending;
  const details = sumSubtaksByStage(list);
  return { days, price, spending, balance, details };
};

// subTasks?: BasicTasks[];

export const sumPriceByStageBasic = (
  list: (GetBasicLevelStage & { subTasks?: BasicTasks[] })[]
) => {
  const totalvalues = list.map(level => {
    if (level.subTasks) {
      const price = sumValues(level.subTasks, 'price');
      const days = sumValues(level.subTasks, 'days');
      const spending = sumValues(level.subTasks, 'spending');
      const balance = price - spending;
      return { price, spending, balance, days };
    }
    return { price: 0, spending: 0, balance: 0, days: 0 };
  });
  const price = sumValues(totalvalues, 'price');
  const days = sumValues(totalvalues, 'days');
  const spending = sumValues(totalvalues, 'spending');
  const balance = price - spending;
  // const details = sumSubtaksByStage(list);
  return { days, price, spending, balance };
};

export const convertToRoman = (number: number) => {
  let numberRoman = '';
  const dataRoman = [
    { value: 1000, roman: 'M' },
    { value: 900, roman: 'CM' },
    { value: 500, roman: 'D' },
    { value: 400, roman: 'CD' },
    { value: 100, roman: 'C' },
    { value: 90, roman: 'XC' },
    { value: 50, roman: 'L' },
    { value: 40, roman: 'XL' },
    { value: 10, roman: 'X' },
    { value: 9, roman: 'IX' },
    { value: 5, roman: 'V' },
    { value: 4, roman: 'IV' },
    { value: 1, roman: 'I' },
  ];
  for (const { roman, value } of dataRoman) {
    while (number >= value) {
      numberRoman += roman;
      number -= value;
    }
  }
  return numberRoman;
};

export const convertToLetter = (number: number) => {
  const _number = number + 64;
  if (_number < 65 || _number > 90) return false;
  return String.fromCharCode(_number);
};
const romanValues = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};
export const numberToConvert = (value: number, type: Levels['typeItem']) => {
  if (type === 'ABC') return convertToLetter(value);
  if (type === 'ROM') return convertToRoman(value);
  return value.toString();
};
export const convertToNumber = (value: string, type: Levels['typeItem']) => {
  if (type === 'ABC') return value.charCodeAt(0);
  if (type === 'ROM') {
    const listRoman = value.split('');
    const getNumber = listRoman.reduce(
      (acc, letter, i, arr) =>
        romanValues[letter as keyof typeof romanValues] <
        romanValues[arr[i + 1] as keyof typeof romanValues]
          ? acc - romanValues[letter as keyof typeof romanValues]
          : acc + romanValues[letter as keyof typeof romanValues],
      0
    );
    return getNumber;
  }
  return parseInt(value);
};

export const convertToUtf8 = (name: string) =>
  Buffer.from(name, 'latin1').toString('utf8');
export const toEditablesFiles = (value: string, type?: 'MODEL' | 'REVIEW') => {
  // const getValue = value.split('/');
  // const index = getValue.findIndex(v => v === 'projects');
  // const rootPath = getValue.slice(0, index).join('/');
  // const lastPath = getValue.slice(index + 1).join('/');
  // const result = rootPath + '/editables/' + lastPath;
  if (type === 'MODEL') return value.replace('projects', 'models');
  if (type === 'REVIEW') return value.replace('projects', 'reviews');
  const result = value.replace('projects', 'editables');
  return result;
};
export const getPathStage = async (id: number, type: ProjectDir) => {
  return await PathServices.stage(id, type);
};
export const getPathProject = async (id: number, type: ProjectDir) => {
  return await PathServices.project(id, type);
};
export const setAdmin = async () => {
  const findAdmin = await prisma.users.findFirst({
    where: { profile: { dni: '00000001' } },
  });
  if (!findAdmin) {
    const password = await bcrypt.hash('admin', 10);
    const role = await prisma.role.create({ data: { name: 'admin' } });
    const createAdmin = await prisma.users.create({
      data: {
        email: `admin${new Date().getTime()}@admin.com`,
        password,
        roleId: role.id,
        status: true,
        address: 'Jr. administrador N°123',
        profile: {
          create: {
            dni: '00000001',
            firstName: 'admin',
            lastName: 'admin',
            phone: '+51 000000001',
            department: 'Puno',
            province: 'Puno',
            district: 'Puno',
            degree: 'titulado',
            job: 'Ingeniero',
          },
        },
      },
    });
    await prisma.menuPoints.create({
      data: {
        //es el menuId del panel para agregar o quitar roles
        menuId: 5,
        typeRol: 'MOD',
        roleId: role.id,
      },
    });
    if (!createAdmin) return false;
    return true;
  }
  return true;
};

export const countByKeyExt = (list: ObjectAny[], key: string): ObjectNumber => {
  return list.reduce((acc: ObjectNumber, value) => {
    let ext = value[key as keyof typeof value];
    if (key == 'name') {
      const extension = value[key] as string;
      ext = extension.split('.').at(-1) || '';
    }
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});
};

export const countByKey = (list: ObjectAny[], key: string): ObjectNumber => {
  return list.reduce((acc: ObjectNumber, value) => {
    let ext = value[key as keyof typeof value];
    if (key == 'name') {
      const extension = value[key] as string;
      ext = extension.split('.').at(-1) || '';
    }
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});
};

export const timerDay = (date: string) => {
  const GMT = 60 * 60 * 1000;
  const today = new Date(date).getTime();
  const startOfDay = new Date(today + GMT * 5);
  const endOfDay = new Date(today + GMT * 29 - 1);
  return { startOfDay, endOfDay };
};
export const DEGREE_DATA: DegreeList[] = [
  {
    degree: 'intern',
    values: [{ id: 1, value: 'Practicante' }],
  },
  {
    degree: 'graduate',
    values: [{ id: 1, value: 'Egresado' }],
  },
  {
    degree: 'bachelor',
    values: [
      { id: 1, value: 'Egresado' },
      { id: 2, value: 'Bachiller' },
    ],
  },
  {
    degree: 'professional',
    values: [
      { id: 3, value: 'Titulado' },
      { id: 4, value: 'Magister' },
      { id: 5, value: 'Doctorado' },
    ],
  },
];
export const findDegree = (degree?: DegreeTypes) => {
  return DEGREE_DATA.find(({ values }) =>
    values.some(({ value }) => value === degree)
  );
};

export const removeUnwantedCharacters = (str: string) => {
  const regex = /[\\/:*?"<>|]/g;
  const result = str.replace(regex, '');
  return result;
};

export const isQueryNumber = (value: string | undefined | null) => {
  const regex = /^\d+$/;
  if (!value) return undefined;
  if (!regex.test(value)) return 0;
  return +value;
};
export const getDaysOfWeekInRange = (dateString: string) => {
  const daysOfWeek = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  const date = new Date(dateString);
  const dayOfWeekIndex = date.getDay();
  const startDate = new Date(date);
  startDate.setDate(
    startDate.getDate() -
      (dayOfWeekIndex < 6 ? Math.abs(-dayOfWeekIndex - 1) : 0)
  );
  const daysOfWeekArray = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    daysOfWeekArray.push({
      day: daysOfWeek[currentDate.getDay()],
      date: currentDate.toISOString().split('T')[0],
    });
  }

  return daysOfWeekArray;
};
interface Member {
  id: number;
  position: string | null;
  fullName: string;
  feedBack: string | null;
  feedBackDate: string | null;
  dailyDuty: string | null;
  dailyDutyDate: string | null;
  attendance: string;
  dutyId: number;
  task: DutyTasks[];
}
interface Duty {
  id: number;
  CUI: string;
  project: string;
  shortName: string | null;
  titleMeeting: string | null;
  dutyGroup: string | null;
  dutyGroupDate: string | null;
  listId: number;
  createdAt: Date;
  members: Member[];
}
interface Weekday {
  day: string;
  date: string;
}
export const TransformWeekDuty = (weekdays: Weekday[], data: Duty[]) => {
  const result = [];
  for (let i = 0; i < weekdays.length; i++) {
    const dayData = weekdays[i];
    const dayDate = new Date(dayData.date);

    const filteredData = data.filter(item => {
      const itemDate = new Date(item.createdAt);
      itemDate.setUTCHours(itemDate.getUTCHours() - 5);
      return (
        itemDate.toISOString().split('T')[0] ===
        dayDate.toISOString().split('T')[0]
      );
    });

    const membersMap = new Map();
    filteredData.forEach(item => {
      item.members.forEach(member => {
        const { fullName, task } = member;
        const existingMember = membersMap.get(fullName);
        if (existingMember) {
          existingMember.tasks.push(...task);
        } else {
          membersMap.set(fullName, { fullName, tasks: [...task] });
        }
      });
    });
    const members = Array.from(membersMap.values());
    result.push({ day: dayData.day, date: dayData.date, members });
  }
  return result;
};
interface StagesType extends Stages {
  project: Projects;
}
interface LevelsType extends Levels {
  stages: StagesType;
}
interface UserType extends User {
  profile: Profiles;
}
export interface SubTasksType extends SubTasks {
  Levels: LevelsType;
  users: UserType[];
}
export const TransformWeekReport = (
  weekdays: Weekday[],
  data: SubTasksType[]
) => {
  const result = [];
  for (let i = weekdays.length - 1; i >= 0; i--) {
    const dayData = weekdays[i];
    const dayDate = new Date(dayData.date);

    const filteredData = data.filter(item => {
      const itemDate = new Date(item.updatedAt);
      itemDate.setUTCHours(itemDate.getUTCHours() - 5);
      return (
        itemDate.toISOString().split('T')[0] ===
        dayDate.toISOString().split('T')[0]
      );
    });
    //console.log(filteredData)
    const membersMap = new Map();
    filteredData.forEach(items => {
      const { name, status, updatedAt, days, users, Levels, id, item } = items;
      membersMap.set(name, {
        name,
        status,
        updatedAt,
        days,
        user: users.length > 0 ? users[0].user.profile : null,
        stage: Levels.stages.name,
        stageId: Levels.stages.id,
        project: Levels.stages.project.name,
        projectId: Levels.stages.project.id,
        subTask: id,
        item,
      });
    });
    const members = Array.from(membersMap.values());
    result.push({ day: dayData.day, date: dayData.date, tasks: members });
  }
  return result;
};

export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export const basenameFromPath = (filePath: string) =>
  filePath.split(/[\\/]/).pop() ?? filePath;
