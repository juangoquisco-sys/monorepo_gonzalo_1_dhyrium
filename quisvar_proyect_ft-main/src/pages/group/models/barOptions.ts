import type { Nav } from '../types/types.request';
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ListTodo,
  Network,
  FolderTree,
  Rows3,
} from 'lucide-react';

export const navItemsWorkspace: Nav[] = [
  {
    to: '/grupos',
    icon: LayoutDashboard,
    title: 'Vista general',
    description: 'Todas las oficinas',
    end: true,
  },
  {
    to: '/grupos/proyectos-oficina',
    icon: Network,
    title: 'Proyectos por oficina',
    description: 'Enlaces y activos',
  },
  {
    to: '/grupos/oficinas/workspace?tab=proyectos',
    icon: FolderTree,
    title: 'Proyectos tecnicos',
    description: 'Arbol por etapa',
  },
  {
    to: '/grupos/mis-informes',
    icon: FileText,
    title: 'Mis informes',
    description: 'Preparacion previa',
  },
  {
    to: '/grupos/calendario',
    icon: CalendarDays,
    title: 'Calendario',
    description: 'Reuniones y actividades',
  },
  {
    to: '/grupos/compromisos',
    icon: Rows3,
    title: 'Compromisos',
    description: 'Tablero por oficina',
  },
  {
    to: '/grupos/propuestas',
    icon: ClipboardCheck,
    title: 'Propuestas',
    description: 'Compromisos por confirmar',
  },
];

export const navItemsLegacy: Nav[] = [
  {
    to: '/grupos',
    icon: BarChart3,
    title: 'Overview antiguo',
    description: 'Vista base de grupos',
    end: true,
  },
  {
    to: 'resumen/reuniones',
    icon: CalendarDays,
    title: 'Reuniones diarias',
    description: 'Flujo anterior',
  },
  {
    to: 'resumen/asistencias',
    icon: ClipboardCheck,
    title: 'Asistencias',
    description: 'Registro anterior',
  },
  {
    to: 'resumen/tareas',
    icon: ListTodo,
    title: 'Tablero de tareas',
    description: 'Reportes anteriores',
  },
];

export const navItemsMeetings = navItemsLegacy;
export const navItemsReports: Nav[] = [];
