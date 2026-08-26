import { unlinkSync } from 'fs';
import AppError from '@/utils/appError';
import type { FolderVideos, Video } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import TutorialMaterialsService from '@/services/tutorialMaterials.services';
import { resolveTutorialMaterialPath } from '@/services/tutorialMaterials.policy';
type videoDoc = {
  name: string;
  path: string;
};
class VideoService {
  static async create(data: Video, docs?: videoDoc[]) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    return prisma.$transaction(async transaction => {
      const video = await transaction.video.create({ data });
      if (docs && docs.length > 0) {
        const docsData = docs.map(doc => ({ ...doc, videoId: video.id }));
        await transaction.videoDocs.createMany({ data: docsData });
      }
      return video;
    });
  }
  static async getByFolderId(folderId: FolderVideos['id']) {
    if (!folderId) throw new AppError(`Oops!, algo salio mal`, 400);
    const videos = await prisma.video.findMany({ where: { folderId } });
    return videos;
  }
  static async getVideo(id: Video['id']) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const video = await prisma.video.findUnique({
      where: { id },
    });
    if (!video) return null;
    const docs = await TutorialMaterialsService.listWithSizes(id);
    return { ...video, docs };
  }
  static async edit(data: Video, id: Video['id']) {
    if (!data || !id) throw new AppError(`Oops!, algo salio mal`, 400);
    const video = await prisma.video.update({ where: { id }, data });
    return video;
  }
  static async delete(id: Video['id']) {
    if (!id) throw new AppError(`Oops!, id incorrecto`, 400);
    const video = await prisma.video.findUnique({ where: { id } });
    if (video?.url) unlinkSync(`public/tutorials/${video.url}`);
    if (video?.miniature) unlinkSync(`public/tutorials/${video.miniature}`);
    await prisma.video.delete({ where: { id } });
    return 'deleted';
  }
  /* ---------------------------------- Docs ---------------------------------- */
  static async addDocs(dataDocs: videoDoc[], id: Video['id']) {
    const data = dataDocs.map(doc => ({ ...doc, videoId: id }));
    const docs = await prisma.videoDocs.createMany({ data });
    return docs;
  }
  static async deleteDoc(id: Video['id']) {
    if (!id) throw new AppError(`Oops!, id incorrecto`, 400);
    const doc = await prisma.videoDocs.findUnique({ where: { id } });
    if (doc?.path) unlinkSync(resolveTutorialMaterialPath(doc.path));
    await prisma.videoDocs.delete({ where: { id } });
    return 'deleted';
  }
  /* --------------------------------- Videos --------------------------------- */
  static async addVideo(
    data: Pick<Video, 'url' | 'miniature'>,
    id: Video['id']
  ) {
    const video = await prisma.video.update({ where: { id }, data });
    return video;
  }
  static async deleteOnlyVideo(id: Video['id']) {
    const video = await prisma.video.findUnique({ where: { id } });
    if (video?.url) unlinkSync(`public/tutorials/${video.url}`);
    if (video?.miniature) unlinkSync(`public/tutorials/${video.miniature}`);
    await prisma.video.update({
      where: { id },
      data: { miniature: '', url: '' },
    });
    return 'deleted';
  }
}
export default VideoService;
