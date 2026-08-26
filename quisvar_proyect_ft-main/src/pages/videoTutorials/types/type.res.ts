export interface Video {
  id: number;
  title: string;
  description?: string;
  url: string | File;
  miniature: string | File;
  mediaTicket: string;
  folderId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  children: Folder[];
  _count: {
    videos: number;
  };
  // videos: Video[];
}
