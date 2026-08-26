export type OrganizationalUnitType =
  | 'GERENCIA'
  | 'OFICINA'
  | 'COORDINACION'
  | 'GRUPO'
  | 'ESPECIALIDAD'
  | 'COMITE_TEMPORAL';

export type OrganizationalMembershipRole =
  | 'GERENTE'
  | 'JEFE'
  | 'COORDINADOR'
  | 'ESPECIALISTA'
  | 'ASISTENTE'
  | 'APOYO';

export interface OrgUnit {
  id: string;
  name: string;
  codemap: string | null;
  directoryKey?: string | null;
  type: OrganizationalUnitType;
  parentId: string | null;
  isActive: boolean;
  memberships?: OrgMembership[];
  children: OrgUnit[];
}

export interface OrgUnitOption extends OrgUnit {
  level: number;
}

export interface OrgUser {
  id: number;
  email?: string;
  status?: boolean;
  profile: {
    firstName: string;
    lastName: string;
    dni: string;
    job?: string | null;
    degree?: string | null;
    userPc?: string | null;
  } | null;
  role?: {
    id: number;
    name: string;
    hierarchy: number;
  } | null;
}

export interface OrgMembership {
  id: string;
  userId: number;
  unitId: string;
  role: OrganizationalMembershipRole;
  positionTitle?: string | null;
  isPrimary: boolean;
  isUnitLead?: boolean;
  startDate: string;
  endDate: string | null;
  user: OrgUser;
}

export interface OrgTreeSummary {
  roots: OrgUnit[];
  flatUnits: OrgUnitOption[];
}

export interface OrgUnitForm {
  id?: string;
  name: string;
  codemap: string;
  type: OrganizationalUnitType;
  parentId: string;
  isActive: boolean;
}

export interface OrgMembershipForm {
  id?: string;
  userId: string;
  role: OrganizationalMembershipRole;
  positionTitle: string;
  isPrimary: boolean;
  startDate: string;
  endDate: string;
}
