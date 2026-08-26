import {
  Companies,
  // Company,
  Consortium,
  Contratc,
  MenuPoints,
  PersonBussiness,
  Profiles,
  Projects,
  Role,
  SubMenuPoints,
  TypeSpecialities,
  // UserRole,
  Users,
} from '@prisma/client';
import type { Request } from 'express';
import AppError from '@/utils/appError';
type MenuPointPick = Pick<MenuPoints, 'id' | 'menuId' | 'typeRol'> & {
  subMenuPoints: Pick<SubMenuPoints, 'id' | 'menuId' | 'typeRol'>[];
};
export type RoleForMenuPick = Pick<Role, 'name'> & {
  menuPoints: MenuPointPick[];
};

export type userPickEdit = Pick<
  Users,
  'email' | 'address' | 'roleId' | 'ruc' | 'userType'
> &
  UserPayrollInfoInput;

export type UserPayrollInfoInput = {
  payrollContractStartDate?: string | Date | null;
  payrollContractEndDate?: string | Date | null;
  payrollMonthlySalary?: string | number | null;
  payrollContractType?: string | null;
};

export type userProfilePick = Pick<
  Users & Profiles,
  | 'email'
  | 'password'
  | 'firstName'
  | 'dni'
  | 'phone'
  | 'lastName'
  | 'job'
  | 'degree'
  | 'description'
  | 'cv'
  | 'declaration'
  | 'department'
  | 'province'
  | 'district'
  | 'ruc'
  | 'address'
  | 'addressRef'
  | 'firstNameRef'
  | 'lastNameRef'
  | 'phoneRef'
  | 'room'
  | 'userPc'
  | 'roleId'
  | 'userType'
  | 'gender'
> &
  UserPayrollInfoInput & { officeIds: number[] };

export type projectPick = Pick<
  Projects,
  'name'
  // | 'description'
  // | 'startDate'
  // | 'untilDate'
  // | 'unique'
  // | 'CUI'
  // | 'percentage'
> & {
  userId: Users['id'];
  typeSpecialityId: TypeSpecialities['id'];
  contractId: Contratc['id'];
  // specialistsInfo: PersonBussinessType[];
  // companyInfo: CompanyType;
  // consortiumInfo: ConsortiumType;
  stageName?: string;
};

export type UpdateProjectPick = Omit<
  projectPick,
  'typeSpecialityId' | 'unique' | 'stageName'
> & {
  // status: Projects['status'];
  contractId: Contratc['id'];
};

export type PersonBussinessType = Omit<PersonBussiness, 'id' | 'projectsId'>;
export type CompanyType = Omit<Companies, 'id' | 'projectsId' | 'consortiumId'>;
export type ConsortiumPick = Omit<Consortium, 'id' | 'projectId'>;
export interface ConsortiumType extends ConsortiumPick {
  companies: CompanyType;
}
export interface userHash {
  password: string;
  id: number;
  // role: UserRole;
  profile: Pick<Profiles, 'firstName' | 'lastName' | 'dni' | 'phone'> | null;
}

interface Quera {
  robert?: string;
}

export const formatQueryParamss = <T extends Quera>(
  query: Request['query']
) => {
  const listQuery = Object.keys(query);
  const list: Partial<T> = {};
  listQuery.forEach(key => {
    let item: T[keyof T] = query[key] as T[keyof T];
    if (typeof item === 'string') {
      item = !isNaN(+item)
        ? (Number(item) as T[keyof T])
        : item.toLowerCase() === 'true'
        ? (true as T[keyof T])
        : item.toLowerCase() === 'false'
        ? (false as T[keyof T])
        : item;
    }
    list[key as keyof T] = item;
  });
  return list as T;
};

export const _parseQueries = <T = Record<string, unknown>>(
  query: Request['query']
): T => {
  const listQuery = Object.keys(query);
  const parseQueries = listQuery.reduce((acc, key) => {
    let item = query[key] as T[keyof T];
    if (typeof item === 'string') {
      item = !isNaN(+item)
        ? (Number(item) as T[keyof T])
        : item.toLowerCase() === 'true'
        ? (true as T[keyof T])
        : item.toLowerCase() === 'false'
        ? (false as T[keyof T])
        : item;
    }
    acc[key] = item;
    return acc;
  }, {} as Record<string, unknown>);
  return parseQueries as T;
};

export const parseQueries = <K>(query: Request['query']) => {
  const parseQueriesArr = Object.entries(query).map(([key, value]) => [
    key,
    value
      ? value.toString().toLowerCase() === 'true'
        ? true
        : value.toString().toLowerCase() === 'false'
        ? false
        : !isNaN(+value)
        ? +value
        : typeof value === 'string' && !isNaN(new Date(value).getTime())
        ? new Date(value)
        : value
      : value?.length
      ? value
      : undefined,
  ]);
  return Object.fromEntries(parseQueriesArr) as K;
};
