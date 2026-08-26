import { axiosInstance } from '@/services/axiosInstance';
import type { Profession, User } from '@/types/types';
import { UserType } from '@/types/userType';

type ProcedureUserOptionResponse = {
  id: number;
  value: string;
  label: string;
  name?: string;
  email: string;
  status: boolean;
  userType?: UserType;
  dni?: string | null;
  degree?: string | null;
  position?: string | null;
  job?: Profession | null;
  phone?: string | null;
  userPc?: string | null;
};

export type ProcedureUserOption = {
  id: number;
  value: string;
  label: string;
  name: string;
  email: string;
  status: boolean;
  userType?: UserType;
  dni: string;
  degree?: string | null;
  position?: string | null;
  job?: Profession | null;
  phone?: string | null;
  userPc?: string | null;
};

const mapProcedureUserOption = (
  user: ProcedureUserOptionResponse
): ProcedureUserOption => {
  const name = user.name || user.label || user.email;

  return {
    ...user,
    name,
    label: user.label || name,
    dni: user.dni ?? '',
  };
};

const mapUserToProcedureUserOption = ({
  profile,
  ...user
}: User): ProcedureUserOption => {
  const name = `${profile.firstName} ${profile.lastName}`.trim() || user.email;

  return {
    id: user.id,
    value: String(user.id),
    label: name,
    name,
    email: user.email,
    status: user.status ?? false,
    userType: user.userType,
    dni: profile.dni ?? '',
    degree: profile.degree,
    position: profile.description,
    job: profile.job,
    phone: profile.phone,
    userPc: profile.userPc,
  };
};

const getUserOptions = async (url: string) => {
  const { data } = await axiosInstance.get<ProcedureUserOptionResponse[]>(url, {
    headers: { noLoader: true },
  });

  return data.map(mapProcedureUserOption);
};

const getPaymailModeratorUsers = async () => {
  const { data } = await axiosInstance.get<User[]>('/users/menupoints', {
    params: {
      menuId: 2,
      typeRol: 'MOD',
      subMenuId: 1,
      subTypeRol: 'MOD',
    },
    headers: { noLoader: true },
  });

  return data.map(mapUserToProcedureUserOption);
};

export const procedureUserLookupsService = {
  getLicenseUsers: () => getUserOptions('/license/users/options'),
  getProductionBonusUsers: () => getUserOptions('/production-bonus/users'),
  getPaymailUsers: () => getUserOptions('/users/options/paymail'),
  getPaymailModeratorUsers,
};
