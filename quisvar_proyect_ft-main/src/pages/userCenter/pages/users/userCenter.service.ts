import { axiosInstance } from '@/services/axiosInstance';
import type { User } from '@/types/types';
import { UserType } from '@/types/userType';

type UserOptionResponse = {
  id: number;
  label: string;
  name: string;
  email: string;
  status: boolean;
  userType?: UserType;
  dni?: string | null;
  phone?: string | null;
  userPc?: string | null;
};

export type EquipmentCandidateUser = {
  id: number;
  email: string;
  status: boolean;
  userType?: UserType;
  profile: {
    firstName: string;
    lastName: string;
    dni: string;
    phone: string;
    userPc: string;
  };
};

const splitName = (value: string) => {
  const [firstName = '', ...lastNameParts] = value.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(' '),
  };
};

const mapEquipmentCandidate = (
  user: UserOptionResponse
): EquipmentCandidateUser => {
  const { firstName, lastName } = splitName(user.name || user.label);

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    userType: user.userType,
    profile: {
      firstName,
      lastName,
      dni: user.dni ?? '',
      phone: user.phone ?? '',
      userPc: user.userPc ?? '',
    },
  };
};

export const UserCenterService = {
  async getUsers() {
    const { data } = await axiosInstance.get<User[]>('/users');

    return data;
  },

  async getEquipmentCandidates() {
    const { data } = await axiosInstance.get<UserOptionResponse[]>(
      '/users/options/user-center',
      {
        params: { includeInactive: false },
        headers: { noLoader: true },
      }
    );

    return data.map(mapEquipmentCandidate);
  },
};
