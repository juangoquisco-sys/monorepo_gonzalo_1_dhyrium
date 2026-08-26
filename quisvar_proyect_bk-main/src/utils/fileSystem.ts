import fs from 'fs';
import { StageParse } from '@/types/types';

export const renameDir = (oldDir: string, newDir: string) => {
  if (oldDir !== newDir) {
    const subDir = fs
      .readdirSync(oldDir)
      .some(file => fs.statSync(oldDir + '/' + file).isDirectory());
    if (subDir) {
      if (process.env.NODE_ENV === 'production') {
        fs.renameSync(oldDir, newDir);
      } else {
        fs.cpSync(oldDir, newDir, { recursive: true });
        fs.rmSync(oldDir, { recursive: true });
      }
    } else {
      fs.renameSync(oldDir, newDir);
    }
  }
};

export const setNewPath = (oldDir: string, path: string) => {
  const arrayOldDir = oldDir.split('/');
  const newPath = arrayOldDir.slice(0, arrayOldDir.length - 1);
  const newDir = [...newPath, path].join('/');
  return newDir;
};

export const parsePath = (item: string, name: string) => {
  return '/' + item + name;
};
export const parsePathLevel = (item: string, name: string) => {
  return '/' + item + name;
};
export const parseProjectName = (stage: StageParse, name: string) => {
  return stage ? name + '-' + stage.name : name;
};
