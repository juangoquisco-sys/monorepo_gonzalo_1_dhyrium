import type { Profession, Role } from '@/types/types';
import type { UserType } from '@/types/userType';

export interface SwornDeclaration {
  declarations?: string[];
  typeDeclaration?: 'technical' | 'administrative';
  declarationDate: Date;
  declarationMonths: number;
}
export interface ContractUser {
  professionalLevel: 1 | 2 | 3;
  contractAmount: number;
  date: Date;
  month: number;
  projectNumber: number;
  numberContract: number;
  welcomeBonus: boolean;
  hasExperience: boolean;
}
export interface OfficeSelect {
  id: number;
  label: string;
  quantity?: number;
  value: string;
}
export interface UserForm {
  id: number | null;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  degree: string;
  address: string;
  department: string;
  room: string;
  gender: string;
  userPc: string;
  province: string;
  district: string;
  roleId: number | null;
  ruc: string;
  job: Profession;
  offices: OfficeSelect[];
  cv: FileList | null;
  firstNameRef: string;
  lastNameRef: string;
  phoneRef: string;
  description?: string;
  userPc: string;
  addressRef: string;
  declaration: FileList | null;
  role: Role | null;
  roleName: string;
  userType: UserType;
  payrollContractStartDate: string;
  payrollContractEndDate: string;
  payrollMonthlySalary: string;
  payrollContractType: string;
}
