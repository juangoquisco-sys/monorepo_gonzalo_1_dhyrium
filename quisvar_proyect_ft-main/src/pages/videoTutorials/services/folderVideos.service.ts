import { BehaviorSubject } from 'rxjs';
import { axiosInstance } from '@/services/axiosInstance';
import type { Folder } from '../types/type.res';

const folderSubject = new BehaviorSubject<Folder[]>([]);

export const folderService = {
  getFolders: async () => {
    const res = await axiosInstance.get<Folder[]>('folderVideos');
    folderSubject.next(res.data);
    return res.data;
  },
  folderObservable: folderSubject.asObservable(),
};
