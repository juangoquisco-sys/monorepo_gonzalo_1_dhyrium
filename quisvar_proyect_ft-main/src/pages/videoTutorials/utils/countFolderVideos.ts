import type { Folder } from '../types/type.res';

export const countFolderVideos = (folder: Folder): number =>
  (folder._count?.videos || 0) +
  (folder.children || []).reduce(
    (total, child) => total + countFolderVideos(child),
    0
  );

export const countFoldersVideos = (folders: Folder[]): number =>
  folders.reduce((total, folder) => total + countFolderVideos(folder), 0);
