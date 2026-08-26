import type { FileTask } from '@/types/types';
import { URL } from '@/services/axiosInstance';

const normalizeTaskFileDirectory = (directory: string) => {
  if (!directory) return '';
  const normalizedDirectory = directory.replace(/\\/g, '/');
  const isProjectFile =
    normalizedDirectory.includes('editables') ||
    normalizedDirectory.includes('projects');

  if (isProjectFile) {
    const relativeDirectory = normalizedDirectory.split('/').slice(3).join('/');
    return `projects/${relativeDirectory}`;
  }

  return normalizedDirectory.replace('./uploads/', 'uploads/');
};

export const getTaskFileExtension = (file: FileTask) =>
  (file.originalname || file.name).split('.').pop()?.toLowerCase() ?? '';

export const isEditableWordFile = (file: FileTask) =>
  getTaskFileExtension(file) === 'docx';

export const listEditableWordFiles = (files: FileTask[]) => {
  const seenIds = new Set<number>();
  return files.filter(file => {
    if (!isEditableWordFile(file) || seenIds.has(file.id)) return false;
    seenIds.add(file.id);
    return true;
  });
};

export const getTaskFileUrl = (file: FileTask) =>
  `${URL}/${normalizeTaskFileDirectory(file.dir)}/${file.name}`;
