import '@/config/env';
import { copyFile, mkdir, stat } from 'fs/promises';
import path from 'path';
import { prisma } from '@/utils/prisma.server';
import {
  basicResourceStorageKey,
  resolveBasicResourceStoragePath,
  resolveLegacyBasicResourceStoragePath,
} from '@/modules/basic-resources/basicResources.storage';

const apply = process.argv.includes('--apply');

async function main() {
  const resources = await prisma.basicResource.findMany({
    where: { storageKey: { startsWith: 'basic-resources/' } },
    select: {
      id: true,
      projectId: true,
      stageId: true,
      originalName: true,
      storageKey: true,
    },
  });
  let bytesVerified = 0;
  let copied = 0;

  for (const resource of resources) {
    const sourcePath = resolveLegacyBasicResourceStoragePath(
      resource.storageKey
    );
    const sourceStats = await stat(sourcePath);
    bytesVerified += sourceStats.size;
    if (!apply) continue;

    const newStorageKey = basicResourceStorageKey(
      resource.projectId,
      resource.stageId,
      resource.originalName
    );
    const destinationPath = resolveBasicResourceStoragePath(newStorageKey);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
    const destinationStats = await stat(destinationPath);
    if (destinationStats.size !== sourceStats.size) {
      throw new Error(`La verificación de tamaño falló para ${resource.id}`);
    }
    await prisma.basicResource.update({
      where: { id: resource.id },
      data: {
        storageKey: newStorageKey,
        storedName: path.basename(newStorageKey),
      },
    });
    copied += 1;
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        legacyResources: resources.length,
        filesCopied: copied,
        bytesVerified,
        legacyFilesRetained: true,
      },
      null,
      2
    )
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
