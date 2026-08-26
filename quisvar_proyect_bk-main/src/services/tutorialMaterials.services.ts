import { stat } from 'fs/promises';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { resolveTutorialMaterialPath } from '@/services/tutorialMaterials.policy';

const storedMaterialSize = async (storedName: string) => {
  try {
    const file = await stat(resolveTutorialMaterialPath(storedName));
    return file.size;
  } catch {
    return 0;
  }
};

class TutorialMaterialsService {
  static async listWithSizes(videoId: number) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        docs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!video) {
      throw new AppError('No se encontró el tutorial solicitado.', 404);
    }

    return Promise.all(
      video.docs.map(async material => ({
        ...material,
        sizeBytes: await storedMaterialSize(material.path),
      }))
    );
  }

  static async existingSizes(videoId: number) {
    const materials = await this.listWithSizes(videoId);
    return materials.map(material => material.sizeBytes);
  }
}

export default TutorialMaterialsService;
