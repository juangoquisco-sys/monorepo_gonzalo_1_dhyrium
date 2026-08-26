import AppError from '@/utils/appError';
import type { FolderVideos } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

class FodlerVideosService {
  static async create(data: FolderVideos) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    const folder = await prisma.folderVideos.create({
      data: {
        ...data,
        parentId: data.parentId ? Number(data.parentId) : null,
      },
    });
    return folder;
  }
  static async getChildren(id: number): Promise<FolderVideos | null> {
    const folder = await prisma.folderVideos.findUnique({
      where: { id },
      include: {
        children: true,
        _count: { select: { videos: true } },
      },
    });

    if (folder && folder.children.length > 0) {
      folder.children = await Promise.all(
        folder.children.map(async child => {
          const childFolder = await this.getChildren(child.id);
          return childFolder!;
        })
      );
    }
    return folder;
  }
  static async getAll() {
    const folders = await prisma.folderVideos.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: true,
        _count: { select: { videos: true } },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    const allFolders = await Promise.all(
      folders.map(async folder => {
        return await this.getChildren(folder.id);
      })
    );
    return allFolders;
  }
  static async edit(id: number, data: FolderVideos) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const folder = await prisma.folderVideos.update({
      where: { id },
      data: { name: data.name },
    });
    return folder;
  }
  static async delete(id: number) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const folder = await prisma.folderVideos.findUnique({
      where: { id },
      select: { children: true, videos: true },
    });
    if (folder?.children && folder.children.length > 0)
      throw new AppError(
        `Oops!, el elemento tiene items y no puede ser eliminado`,
        400
      );
    if (folder?.videos && folder.videos.length > 0)
      throw new AppError(
        `Oops!, el elemento tiene videos y no puede ser eliminado`,
        400
      );
    await prisma.folderVideos.delete({
      where: { id },
    });
    return 'ok';
  }
}
export default FodlerVideosService;
