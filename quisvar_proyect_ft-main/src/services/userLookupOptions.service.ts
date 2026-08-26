import { axiosInstance } from './axiosInstance';
import type { Degree, Profession } from '@/types/types';
import { UserType } from '@/types/userType';

type UserLookupOptionResponse = {
  id: number;
  value?: string;
  label?: string;
  name?: string;
  email?: string;
  status?: boolean;
  userType?: UserType;
  profileId?: number | null;
  dni?: string | null;
  degree?: Degree | null;
  position?: string | null;
  job?: Profession | null;
  phone?: string | null;
  userPc?: string | null;
};

type MenuPointUserResponse = {
  id: number;
  status?: boolean;
  email?: string;
  userType?: UserType;
  profile?: {
    id?: number;
    firstName?: string | null;
    lastName?: string | null;
    dni?: string | null;
    degree?: Degree | null;
    description?: string | null;
    job?: Profession | null;
    phone?: string | null;
    userPc?: string | null;
  } | null;
};

export type UserLookupOption = {
  id: number;
  value: string;
  label: string;
  name: string;
  email?: string;
  status?: boolean;
  userType?: UserType;
  profileId?: number | null;
  dni: string;
  degree?: Degree | null;
  position?: string | null;
  job?: Profession | null;
  phone?: string | null;
  userPc?: string | null;
};

const mapLookupOption = (user: UserLookupOptionResponse): UserLookupOption => {
  const name = user.name || user.label || user.email || `Usuario ${user.id}`;

  return {
    id: user.id,
    value: user.value ?? String(user.id),
    label: user.label || name,
    name,
    email: user.email,
    status: user.status,
    userType: user.userType,
    profileId: user.profileId,
    dni: user.dni ?? '',
    degree: user.degree,
    position: user.position,
    job: user.job,
    phone: user.phone,
    userPc: user.userPc,
  };
};

const mapMenuPointUser = (user: MenuPointUserResponse): UserLookupOption => {
  const firstName = user.profile?.firstName ?? '';
  const lastName = user.profile?.lastName ?? '';
  const name =
    `${firstName} ${lastName}`.trim() || user.email || `Usuario ${user.id}`;

  return {
    id: user.id,
    value: String(user.id),
    label: name,
    name,
    email: user.email,
    status: user.status,
    userType: user.userType,
    profileId: user.profile?.id ?? null,
    dni: user.profile?.dni ?? '',
    degree: user.profile?.degree,
    position: user.profile?.description,
    job: user.profile?.job,
    phone: user.profile?.phone,
    userPc: user.profile?.userPc,
  };
};

const getUserOptions = async (url: string) => {
  const { data } = await axiosInstance.get<UserLookupOptionResponse[]>(url, {
    headers: { noLoader: true },
  });

  return data.map(mapLookupOption);
};

const getProjectModeratorUsers = async () => {
  const { data } = await axiosInstance.get<MenuPointUserResponse[]>(
    '/users/menupoints',
    {
      params: {
        menuId: 3,
        typeRol: 'MOD',
      },
      headers: { noLoader: true },
    }
  );

  return data.map(mapMenuPointUser);
};

export const userLookupOptionsService = {
  getAuditUsers: () => getUserOptions('/users/options/audit'),
  getFrontendLogUsers: () => getUserOptions('/users/options/frontend-logs'),
  getCompanyUsers: () => getUserOptions('/users/options/companies'),
  getGroupUsers: () => getUserOptions('/users/options/groups'),
  getOfficeUsers: () => getUserOptions('/users/options/offices'),
  getProjectUsers: () => getUserOptions('/users/options/projects'),
  getProjectModeratorUsers,
};
