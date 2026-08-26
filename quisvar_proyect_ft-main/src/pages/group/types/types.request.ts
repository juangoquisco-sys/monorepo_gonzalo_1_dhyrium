import type { Group } from '@/types/types';
import type { LucideIcon } from 'lucide-react';

export type GroupReq = {
  id: number;
};
export type PdfInfoProps = {
  title?: string;
  group?: string;
  mod?: string;
  createdAt?: string;
};
export type ProjectList = {
  id: number;
  cui: string;
  projectName?: string;
};
export type Nav = {
  to: string;
  imgSrc?: string;
  imgAlt?: string;
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  end?: boolean;
};
export type Division = {
  id: number;
  name: string;
  order: true;
  groups: Group[];
};
