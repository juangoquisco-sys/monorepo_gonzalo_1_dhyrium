import AppError from '@/utils/appError';
import { UserPayrollInfoInput, userProfilePick } from '@/utils/format.server';
import { enviarCorreoAgradecimiento } from '@/utils/mailer';
import type { Profiles, Users } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { buildUserCommandRows } from '@/services/iclockCommand.service';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import RoleService from '@/services/role.service';
import { MenuPoints } from '@/models/menuPoints';
import professionServices from '@/services/profession.services';
import { ProfileByRoleType } from '@/types/types';
import Queries from '@/utils/queries';

const menuPoints = new MenuPoints();

const parseOptionalDate = (
  value: UserPayrollInfoInput[keyof UserPayrollInfoInput],
  label: string
) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value as string | Date);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${label} no tiene una fecha valida`, 400);
  }
  return parsed;
};

const parseOptionalSalary = (
  value: UserPayrollInfoInput['payrollMonthlySalary']
) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError('El sueldo mensual no tiene un monto valido', 400);
  }
  return parsed;
};

const validatePayrollInfoData = (
  data: ReturnType<typeof buildRawPayrollInfoData>
) => {
  if (!data) return null;

  if (
    data.contractStartDate &&
    data.contractEndDate &&
    data.contractEndDate < data.contractStartDate
  ) {
    throw new AppError(
      'El fin de contrato no puede ser menor al inicio de contrato',
      400
    );
  }

  if (data.monthlySalary !== null && Number(data.monthlySalary) <= 0) {
    throw new AppError('El sueldo mensual debe ser mayor a 0', 400);
  }

  return data;
};

const buildRawPayrollInfoData = (data: UserPayrollInfoInput) => {
  return {
    contractStartDate: parseOptionalDate(
      data.payrollContractStartDate,
      'El inicio de contrato'
    ),
    contractEndDate: parseOptionalDate(
      data.payrollContractEndDate,
      'El fin de contrato'
    ),
    monthlySalary: parseOptionalSalary(data.payrollMonthlySalary),
    contractType: String(data.payrollContractType || 'PLANILLA').trim(),
    status: true,
  };
};

const buildPayrollInfoData = (data: UserPayrollInfoInput) => {
  const hasPayrollData = [
    data.payrollContractStartDate,
    data.payrollContractEndDate,
    data.payrollMonthlySalary,
  ].some(value => value !== undefined && value !== null && value !== '');

  if (!hasPayrollData) return null;

  return validatePayrollInfoData(buildRawPayrollInfoData(data));
};

class UsersServices {
  static async getAll() {
    const users = await prisma.users.findMany({
      where: {
        role: {
          hierarchy: { in: [1, 2] },
        },
      },
      orderBy: [
        {
          profile: {
            lastName: 'asc',
          },
        },
      ],
      include: {
        profile: true,
        role: Queries.includeRole,
        payrollInfo: true,
        offices: {
          select: {
            isOfficeManager: true,
            office: { select: { id: true, name: true } },
          },
        },
        equipment: {
          include: {
            workStation: true,
          },
        },
      },
    });

    const employee = await prisma.users.findMany({
      where: {
        role: {
          hierarchy: { gte: 3 },
        },
      },
      orderBy: [
        {
          profile: {
            lastName: 'asc',
          },
        },
      ],
      include: {
        profile: true,
        role: Queries.includeRole,
        payrollInfo: true,
        offices: {
          select: {
            isOfficeManager: true,
            office: { select: { id: true, name: true } },
          },
        },
        equipment: {
          include: {
            workStation: true,
          },
        },
      },
    });
    const merge = [...users, ...employee];
    if (merge.length == 0)
      throw new AppError('No se pudo encontrar el registro de usuarios', 404);
    const userWithMenus = merge.map(({ password, ...user }) =>
      password && user.role
        ? {
            ...user,
            role: menuPoints.getHeadersOptions(user.role),
          }
        : user
    );
    const userWithProfession =
      professionServices.userWithProfession(userWithMenus);
    return userWithProfession;
  }

  static async find(id: Users['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findUser = await prisma.users.findUnique({
      where: { id },
      include: {
        profile: true,
        payrollInfo: true,
        offices: {
          select: {
            officeId: true,
            office: {
              select: {
                name: true,
                _count: {
                  select: { users: { where: { isOfficeManager: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!findUser) throw new AppError('No se pudo encontrar el usuario', 404);
    const isAccessReception = !!findUser.offices.find(
      ({ officeId }) => officeId === 1
    );
    const offices = findUser.offices.filter(
      ({ office, officeId }) => office._count.users && officeId !== 1
    );
    const role = await RoleService.findGeneral(findUser.roleId!);
    return {
      ...findUser,
      offices,
      isAccessReception,
      role,
      profile: {
        ...findUser.profile,
        job: professionServices.find(findUser.profile?.job || ''),
      },
    };
  }

  static async findForSign(id: Users['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findUser = await prisma.users.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!findUser) throw new AppError('No se pudo encontrar el usuario', 404);
    return findUser;
  }

  static async findByDni(dni: Profiles['dni']) {
    if (!dni) throw new AppError('Oops!,dni invalido', 409);
    const findUser = await prisma.users.findFirst({
      where: {
        profile: {
          dni,
        },
      },
      include: {
        profile: true,
      },
    });
    if (!findUser) throw new AppError('No se pudo encontrar el usuario', 404);
    return findUser;
  }
  static async findByTokenAndId(id: number, token: string) {
    const findUser = await prisma.users.findFirst({
      where: {
        id,
        verificationUser: {
          token,
        },
      },
    });
    if (!findUser) throw new AppError('Algo salio mal', 404);
    return findUser;
  }

  static async findListTask(id: Users['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    return;
  }

  static async findLisTaskByUser(userId: Users['id']) {
    if (!userId) throw new AppError('Oops!,ID invalido', 400);
    const taskList = await prisma.taskOnUsers.findMany({
      where: { userId, subtask: { status: { in: ['PROCESS', 'INREVIEW'] } } },
      orderBy: { subtaskId: 'desc' },
      select: {
        subtask: {
          include: {
            Levels: {
              select: {
                id: true,
                name: true,
                stages: {
                  select: {
                    id: true,
                    name: true,
                    project: {
                      select: {
                        id: true,
                        name: true,
                        contract: {
                          select: {
                            id: true,
                            district: true,
                            name: true,
                            projectName: true,
                            projectShortName: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return taskList;
  }

  static async getUserMenuPoints(
    userId: number,
    { typeRol, menuId, subMenuId, subTypeRol, includeSelf }: ProfileByRoleType
  ) {
    const notIn = includeSelf ? [userId] : [];
    const getListUser = await prisma.role.findMany({
      where: {
        users: { some: { id: { notIn }, status: true } },
        menuPoints: {
          some: {
            menuId,
            typeRol,
            subMenuPoints: subMenuId
              ? { some: { menuId: subMenuId, typeRol: subTypeRol } }
              : {},
          },
        },
      },
      select: {
        users: {
          where: { id: { notIn }, status: true },
          select: {
            ...Queries.selectProfileUser.select,
            email: true,
            status: true,
            userType: true,
          },
        },
      },
    });
    const parseList = getListUser.map(({ users }) => {
      const parseUsers = users.map(user => {
        const job = professionServices.find(user.profile?.job || '');
        const _user = { ...user, profile: { ...user.profile, job } };
        return _user;
      });
      return parseUsers;
    });
    return parseList.flat().sort();
  }

  static async findListSubTask(userId: Users['id'], projectId: number) {
    if (!userId) throw new AppError('Oops!,ID invalido', 400);
    if (!projectId) {
      const subTaskGeneral = await prisma.taskOnUsers.findMany({
        where: { userId, subtask: { status: { in: ['PROCESS', 'INREVIEW'] } } },
        orderBy: { subtaskId: 'desc' },
        select: {
          subtask: {
            include: {
              Levels: {
                select: {
                  stages: {
                    select: {
                      id: true,
                      projectId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!subTaskGeneral)
        throw new AppError('No se pudo encontrar las tareas', 404);
      const list = subTaskGeneral.map(s => s.subtask);
      return list;
    }
    const subtaskByTask = await prisma.subTasks.findMany({
      where: {
        users: {
          every: { userId },
        },
      },
      include: {
        users: {
          select: {
            assignedAt: true,
          },
        },
      },
    });

    if (!subtaskByTask)
      throw new AppError('No se pudo encontrar las tareas', 404);
    return subtaskByTask;
  }

  static async create({
    email,
    password,
    firstName,
    lastName,
    dni,
    phone,
    degree,
    job,
    cv,
    declaration,
    department,
    district,
    province,
    ruc,
    address,
    addressRef,
    firstNameRef,
    room,
    userPc,
    lastNameRef,
    phoneRef,
    description,
    roleId,
    userType,
    gender,
    officeIds,
    payrollContractStartDate,
    payrollContractEndDate,
    payrollMonthlySalary,
    payrollContractType,
  }: userProfilePick) {
    const passwordHash = await bcrypt.hash(password, 10);
    const officeData = officeIds.map(officeId => ({ officeId }));
    const payrollInfoData = buildPayrollInfoData({
      payrollContractStartDate,
      payrollContractEndDate,
      payrollMonthlySalary,
      payrollContractType,
    });
    const newUser = await prisma.$transaction(async tx => {
      const user = await tx.users.create({
        data: {
          email,
          password: passwordHash,
          cv,
          ruc,
          address,
          declaration,
          roleId: +roleId!,
          userType,
          offices: {
            createMany: { data: officeData, skipDuplicates: true },
          },
          payrollInfo: payrollInfoData
            ? { create: payrollInfoData }
            : undefined,
          profile: {
            create: {
              firstName,
              lastName,
              dni,
              phone,
              degree,
              job,
              department,
              province,
              district,
              addressRef,
              phoneRef,
              firstNameRef,
              room,
              userPc,
              lastNameRef,
              description,
              gender,
            },
          },
        },
      });

      const commandRows = buildUserCommandRows({
        userId: user.id,
        pin: dni,
        name: `${firstName} ${lastName}`,
      });
      if (commandRows.length) {
        await tx.iclockDeviceCommand.createMany({ data: commandRows });
      }

      return user;
    });
    enviarCorreoAgradecimiento(
      email,
      `Tus datos de acceso son: \n DNI: ${dni} \n Contraseña: ${password}`
    );
    return newUser;
  }

  static async update(id: Users['id'], { status }: Pick<Users, 'status'>) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateUser = await prisma.users.update({
      where: { id },
      data: {
        status,
      },
    });
    return updateUser;
  }
  static async updateStatusFile(
    id: Users['id'],
    data: Prisma.UsersUpdateInput
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateUser = await prisma.users.update({
      where: { id },
      data,
    });
    return updateUser;
  }

  static async delete(id: Users['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const deleteUser = await prisma.users.delete({
      where: { id },
    });
    return deleteUser;
  }
}
export default UsersServices;
