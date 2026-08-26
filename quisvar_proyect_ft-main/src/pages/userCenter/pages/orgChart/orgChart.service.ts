import { axiosInstance } from '@/services/axiosInstance';
import type { GeneralFile, RoleForm, User } from '@/types/types';
import type {
  OrgMembership,
  OrgTreeSummary,
  OrgUnit,
  OrgUnitForm,
  OrgUnitOption,
  OrgMembershipForm,
} from './types';

const normalizeTree = (data: OrgUnit[] | OrgUnit | null): OrgUnit[] => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

export const flattenOrgUnits = (units: OrgUnit[], level = 0): OrgUnitOption[] =>
  units.flatMap(unit => [
    { ...unit, level },
    ...flattenOrgUnits(unit.children || [], level + 1),
  ]);

export const findOrgUnit = (units: OrgUnit[], id?: string): OrgUnit | null => {
  if (!id) return null;
  for (const unit of units) {
    if (unit.id === id) return unit;
    const child = findOrgUnit(unit.children || [], id);
    if (child) return child;
  }
  return null;
};

export const collectDescendantIds = (unit?: OrgUnit | null): Set<string> => {
  const ids = new Set<string>();
  const visit = (current?: OrgUnit | null) => {
    current?.children?.forEach(child => {
      ids.add(child.id);
      visit(child);
    });
  };
  visit(unit);
  return ids;
};

export const orgChartService = {
  async getTree(): Promise<OrgTreeSummary> {
    const { data } = await axiosInstance.get<OrgUnit[] | OrgUnit>('/org/tree', {
      params: { scope: 'directory' },
      headers: { noLoader: true },
    });
    const roots = normalizeTree(data);
    return {
      roots,
      flatUnits: flattenOrgUnits(roots),
    };
  },

  async getUsers(): Promise<User[]> {
    const { data } = await axiosInstance.get<User[]>('/users', {
      headers: { noLoader: true },
    });
    return data;
  },

  async getUserDetail(userId: number): Promise<User> {
    const { data } = await axiosInstance.get<User>(`/users/${userId}`, {
      headers: { noLoader: true },
    });
    return data;
  },

  async getUserFormRoles(): Promise<RoleForm[]> {
    const { data } = await axiosInstance.get<RoleForm[]>('/role/form', {
      headers: { noLoader: true },
    });
    return data;
  },

  async getGeneralFiles(): Promise<GeneralFile[]> {
    const { data } = await axiosInstance.get<GeneralFile[]>(
      '/files/generalFiles',
      { headers: { noLoader: true } }
    );
    return data;
  },

  async getMembers(unitId: string, date?: string): Promise<OrgMembership[]> {
    const { data } = await axiosInstance.get<OrgMembership[]>(
      `/org/units/${unitId}/members`,
      {
        params: date ? { date } : undefined,
        headers: { noLoader: true },
      }
    );
    return data;
  },

  async createUnit(form: OrgUnitForm): Promise<OrgUnit> {
    const { data } = await axiosInstance.post<OrgUnit>('/org/units', {
      name: form.name.trim(),
      codemap: form.codemap.trim() || null,
      type: form.type,
      parentId: form.parentId || null,
      isActive: form.isActive,
    });
    return data;
  },

  async updateUnit(
    unitId: string,
    form: OrgUnitForm
  ) {
    await axiosInstance.patch(`/org/units/${unitId}`, {
      name: form.name.trim(),
      codemap: form.codemap.trim() || null,
      type: form.type,
      parentId: form.parentId || null,
      isActive: form.isActive,
    });
  },

  async deactivateUnit(unitId: string) {
    await axiosInstance.delete(`/org/units/${unitId}`);
  },

  async createMembership(unitId: string, form: OrgMembershipForm) {
    await axiosInstance.post('/org/memberships', {
      userId: Number(form.userId),
      unitId,
      role: form.role,
      positionTitle: form.positionTitle.trim() || null,
      isPrimary: form.isPrimary,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    });
  },

  async updateMembership(
    membershipId: string,
    unitId: string,
    form: OrgMembershipForm
  ) {
    await axiosInstance.patch(`/org/memberships/${membershipId}`, {
      userId: Number(form.userId),
      unitId,
      role: form.role,
      positionTitle: form.positionTitle.trim() || null,
      isPrimary: form.isPrimary,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    });
  },

  async terminateMembership(membershipId: string) {
    await axiosInstance.patch(`/org/memberships/${membershipId}/terminate`);
  },
};
