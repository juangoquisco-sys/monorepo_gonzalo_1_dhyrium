import path from 'path';
import { stat } from 'fs/promises';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';

const tutorialDirectory = path.resolve('public/tutorials');
const tutorialMaterialsDirectory = path.resolve(tutorialDirectory, 'docs');

const resolveStoredFile = (directory: string, storedName: string) => {
  if (!storedName || path.basename(storedName) !== storedName) {
    throw new AppError('La ruta del archivo del tutorial no es válida.', 400);
  }

  const resolved = path.resolve(directory, storedName);
  if (path.dirname(resolved) !== directory) {
    throw new AppError('La ruta del archivo del tutorial no es válida.', 400);
  }
  return resolved;
};

const assertFileExists = async (filePath: string) => {
  try {
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error('not a file');
  } catch {
    throw new AppError('No se encontró el archivo del tutorial.', 404);
  }
};

class TutorialMediaService {
  static async video(videoId: number) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { url: true },
    });
    if (!video?.url) throw new AppError('El tutorial no tiene video.', 404);

    const filePath = resolveStoredFile(tutorialDirectory, video.url);
    await assertFileExists(filePath);
    return filePath;
  }

  static async thumbnail(videoId: number) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { miniature: true },
    });
    if (!video?.miniature) {
      throw new AppError('El tutorial no tiene miniatura.', 404);
    }

    const filePath = resolveStoredFile(tutorialDirectory, video.miniature);
    await assertFileExists(filePath);
    return filePath;
  }

  static async material(videoId: number, materialId: number) {
    const material = await prisma.videoDocs.findUnique({
      where: { id: materialId },
      select: { name: true, path: true, videoId: true },
    });
    if (!material || material.videoId !== videoId) {
      throw new AppError('No se encontró el material del tutorial.', 404);
    }

    const filePath = resolveStoredFile(
      tutorialMaterialsDirectory,
      material.path
    );
    await assertFileExists(filePath);
    return { filePath, name: material.name };
  }
}

export default TutorialMediaService;
