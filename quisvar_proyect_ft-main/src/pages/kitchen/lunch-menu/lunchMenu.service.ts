import { axiosInstance } from '@/services/axiosInstance';

export type LunchMenu = {
  serviceDate: string;
  version: number;
  soupAvailable: boolean;
  soupName: string | null;
  dessertAvailable: boolean;
  dessertName: string | null;
  refreshmentAvailable: boolean;
  refreshmentName: string | null;
  publishedAt: string;
  closesAt: string;
  isOpen: boolean;
  isEligible: boolean;
  seconds: Array<{ id: number; name: string; nutrition?: NutritionEstimate | null }>;
  soupNutrition?: NutritionEstimate | null;
  dessertNutrition?: NutritionEstimate | null;
  refreshmentNutrition?: NutritionEstimate | null;
  selection: {
    lunchMenuSecondId: number;
    wantsSoup: boolean;
    wantsDessert: boolean;
    wantsRefreshment: boolean;
    source: 'SELF' | 'ADMIN' | 'AUTO';
    selectedAt: string;
  } | null;
};

export type LunchMenuModeration = Omit<LunchMenu, 'isEligible' | 'selection'> & {
  users: Array<{
    userId: number;
    fullName: string;
    dni: string | null;
    selection: LunchMenu['selection'] & { assignedById?: number | null };
  }>;
};

export const getLunchMenu = async (date: string, signal?: AbortSignal) =>
  (await axiosInstance.get<LunchMenu>(`/lunch-menus/${date}`, { signal })).data;

export const saveLunchMenuSelection = async (
  date: string,
  body: {
    lunchMenuSecondId: number;
    wantsSoup: boolean;
    wantsDessert: boolean;
    wantsRefreshment: boolean;
  }
) => (await axiosInstance.post(`/lunch-menus/${date}/selections`, body)).data;

export const getLunchMenuModeration = async (date: string, signal?: AbortSignal) =>
  (await axiosInstance.get<LunchMenuModeration>(`/lunch-menus/${date}/moderation`, { signal })).data;

export const assignLunchMenuSelection = async (
  date: string,
  userId: number,
  body: {
    lunchMenuSecondId: number;
    wantsSoup: boolean;
    wantsDessert: boolean;
    wantsRefreshment: boolean;
  }
) => (await axiosInstance.post(`/lunch-menus/${date}/selections/${userId}`, body)).data;

export const assignMostRequestedLunchMenuSelections = async (
  date: string,
  assignments: Array<{
    userId: number;
    wantsSoup: boolean;
    wantsDessert: boolean;
    wantsRefreshment: boolean;
  }>
) =>
  (await axiosInstance.post(`/lunch-menus/${date}/assign-most-requested`, { assignments })).data;

export const previewMostRequestedLunchMenuSelections = async (date: string) =>
  (await axiosInstance.get(`/lunch-menus/${date}/assign-most-requested-preview`)).data;

export const getLunchMenuConsolidated = async (date: string) =>
  (await axiosInstance.get(`/lunch-menus/${date}/consolidated`)).data;

export const publishLunchMenu = async (body: {
  serviceDate: string;
  seconds: string[];
  soupAvailable: boolean;
  soupName?: string;
  dessertAvailable?: boolean;
  dessertName?: string;
  refreshmentName?: string;
  durationMinutes?: number;
}) =>
  (await axiosInstance.post('/lunch-menus', body)).data;
export const closeLunchMenu = async (date: string) => (await axiosInstance.post(`/lunch-menus/${date}/close`)).data;
export const reopenLunchMenu = async (date: string, durationMinutes?: number) => (await axiosInstance.post(`/lunch-menus/${date}/reopen`, { durationMinutes })).data;

export type NutritionEstimate = { servingLabel: string; caloriesKcal: number; proteinG: number; carbsG: number; fatG: number; confidence: number; summaryEs?: string };
export type ImportedDish = { rawName: string; normalizedName: string; nutrition: NutritionEstimate };
export type ImportedMenu = { soup: ImportedDish | null; seconds: ImportedDish[]; dessert: ImportedDish | null; refreshment: ImportedDish | null };
export type LunchMenuImportProposal = { id: string; serviceDate: string; durationMinutes: number; status: 'DRAFT' | 'REVIEWED' | 'PUBLISHED' | 'FAILED'; parsedMenu: ImportedMenu };
export const createLunchMenuImportProposal = async (body: { serviceDate: string; durationMinutes: number; originalText: string }) => (await axiosInstance.post<LunchMenuImportProposal>('/lunch-menus/import-proposals', body)).data;
export const updateLunchMenuImportProposal = async (id: string, body: { parsedMenu: ImportedMenu; durationMinutes: number }) => (await axiosInstance.patch<LunchMenuImportProposal>(`/lunch-menus/import-proposals/${id}`, body)).data;
export const publishLunchMenuImportProposal = async (id: string) => (await axiosInstance.post(`/lunch-menus/import-proposals/${id}/publish`)).data;
