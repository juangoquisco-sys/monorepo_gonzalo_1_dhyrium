import { Profiles, Users } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { UserPayrollInfoInput, userPickEdit } from '@/utils/format.server';

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

const validatePayrollInfoData = (
  data: ReturnType<typeof buildRawPayrollInfoData>
) => {
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

const buildPayrollInfoData = (data: UserPayrollInfoInput) => {
  const hasPayrollData = [
    data.payrollContractStartDate,
    data.payrollContractEndDate,
    data.payrollMonthlySalary,
  ].some(value => value !== undefined && value !== null && value !== '');

  if (!hasPayrollData) return null;

  return validatePayrollInfoData(buildRawPayrollInfoData(data));
};

class ProfileServices {
  static async update(
    id: Users['id'],
    {
      firstName,
      lastName,
      phone,
      dni,
      degree,
      job,
      description,
      department,
      district,
      province,
      addressRef,
      firstNameRef,
      lastNameRef,
      phoneRef,
      room,
      userPc,
      gender,
      officeIds,
    }: Profiles & { officeIds?: number[] },
    {
      email,
      address,
      ruc,
      roleId,
      userType,
      payrollContractStartDate,
      payrollContractEndDate,
      payrollMonthlySalary,
      payrollContractType,
    }: userPickEdit
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const officeData = officeIds?.map(officeId => ({ officeId }));
    const payrollInfoData = buildPayrollInfoData({
      payrollContractStartDate,
      payrollContractEndDate,
      payrollMonthlySalary,
      payrollContractType,
    });
    const updateUser = await prisma.users.update({
      where: { id },
      data: {
        email,
        address,
        ruc,
        roleId,
        userType,
        profile: {
          update: {
            firstName,
            lastName,
            phone,
            dni,
            degree,
            job,
            description,
            department,
            district,
            province,
            addressRef,
            firstNameRef,
            lastNameRef,
            phoneRef,
            room,
            userPc,
            gender,
          },
        },
        offices: officeData
          ? {
              deleteMany: { usersId: id, isOfficeManager: false },
              createMany: { data: officeData, skipDuplicates: true },
            }
          : {},
        payrollInfo: payrollInfoData
          ? {
              upsert: {
                create: payrollInfoData,
                update: payrollInfoData,
              },
            }
          : undefined,
      },
    });
    return updateUser;
  }

  public static setInformation(profile: Profiles) {
    const { firstName, lastName, dni } = profile;
    const fullname = lastName + ' ' + firstName;
    return { fullname, firstName, lastName, dni };
  }
}

export default ProfileServices;
