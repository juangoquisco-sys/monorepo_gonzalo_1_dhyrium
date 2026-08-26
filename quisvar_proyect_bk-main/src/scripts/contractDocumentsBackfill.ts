import { createHash, randomUUID } from 'node:crypto';
import { access, copyFile, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { DocumentArtifactStatus, DocumentArtifactType } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import {
  assertPdfDestination,
  type LegacyTreeNode,
} from '@/modules/contract-documents/contractDocumentTree';
import {
  createComposerWorkDir,
  persistArtifactFile,
  removeComposerPath,
} from '@/modules/document-composer/documentComposer.storage';
import {
  getPdfPageCount,
  validatePdfWithQpdf,
} from '@/modules/document-composer/qpdf.service';
import { DOCUMENT_COMPOSER_LIMITS } from '@/modules/document-composer/documentComposer.constants';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ownerArg = args.find(argument => argument.startsWith('--owner-id='));
const ownerId = Number(ownerArg?.split('=')[1]);
const legacyRootArg = args.find(argument =>
  argument.startsWith('--legacy-root=')
);
const legacyRoot = path.resolve(
  legacyRootArg?.slice('--legacy-root='.length) ||
    path.join(process.cwd(), 'index', 'contracts')
);

const run = async () => {
  if (apply && (!Number.isInteger(ownerId) || ownerId <= 0)) {
    throw new Error('Use --owner-id=<id> junto con --apply.');
  }
  if (apply) {
    const owner = await prisma.users.findUnique({ where: { id: ownerId } });
    if (!owner) throw new Error(`No existe el usuario propietario ${ownerId}.`);
  }

  try {
    await access(legacyRoot);
  } catch {
    if (apply) {
      throw new Error(
        `No existe la raíz legada ${legacyRoot}. Use --legacy-root=<ruta> si el volumen está montado en otra ubicación.`
      );
    }
    console.warn(`Sin raíz legada para previsualizar: ${legacyRoot}`);
    console.log(
      JSON.stringify({
        mode: 'dry-run',
        planned: 0,
        migrated: 0,
        skipped: 0,
      })
    );
    return;
  }

  const directories = await readdir(legacyRoot, { withFileTypes: true });
  let planned = 0;
  let migrated = 0;
  let skipped = 0;

  for (const directory of directories) {
    if (!directory.isDirectory() || !/^\d+$/.test(directory.name)) continue;
    const contractId = Number(directory.name);
    const contract = await prisma.contratc.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      skipped += 1;
      console.warn(`Contrato inexistente: ${contractId}`);
      continue;
    }
    const files = await readdir(path.join(legacyRoot, directory.name), {
      withFileTypes: true,
    });
    for (const file of files) {
      if (!file.isFile() || !file.name.toLowerCase().endsWith('.pdf')) continue;
      const levelCode = file.name.match(/^(\d+(?:\.\d+){1,2})\s+/)?.[1];
      if (!levelCode) {
        skipped += 1;
        console.warn(`Nombre sin código reconocido: ${file.name}`);
        continue;
      }
      let level: LegacyTreeNode;
      try {
        level = assertPdfDestination(contract.indexContract, levelCode);
      } catch {
        skipped += 1;
        console.warn(`Nivel inválido ${contractId}/${levelCode}`);
        continue;
      }
      const existing = await prisma.contractDocument.findUnique({
        where: { contractId_levelCode: { contractId, levelCode } },
      });
      if (existing?.currentVersionId) {
        skipped += 1;
        continue;
      }

      planned += 1;
      if (!apply) {
        console.log(`[dry-run] ${contractId}/${levelCode}: ${file.name}`);
        continue;
      }

      const sourcePath = path.join(legacyRoot, directory.name, file.name);
      await validatePdfWithQpdf(sourcePath);
      const pageCount = await getPdfPageCount(sourcePath);
      const sizeBytes = (await stat(sourcePath)).size;
      if (
        pageCount > DOCUMENT_COMPOSER_LIMITS.maxPages ||
        sizeBytes > DOCUMENT_COMPOSER_LIMITS.maxPdfBytes
      ) {
        skipped += 1;
        console.warn(`Límite excedido: ${sourcePath}`);
        continue;
      }

      const artifactId = randomUUID();
      const workDir = await createComposerWorkDir();
      const workPath = path.join(workDir, 'legacy.pdf');
      try {
        await copyFile(sourcePath, workPath);
        const { storageKey } = await persistArtifactFile(
          workPath,
          ownerId,
          artifactId
        );
        const sha256 = createHash('sha256')
          .update(await readFile(sourcePath))
          .digest('hex');
        await prisma.$transaction(async transaction => {
          const artifact = await transaction.documentArtifact.create({
            data: {
              id: artifactId,
              ownerId,
              type: DocumentArtifactType.LEGACY_PDF,
              status: DocumentArtifactStatus.PUBLISHED,
              safeName: file.name,
              originalName: file.name,
              storageKey,
              mimeType: 'application/pdf',
              sizeBytes,
              pageCount,
              sha256,
            },
          });
          const document = await transaction.contractDocument.upsert({
            where: { contractId_levelCode: { contractId, levelCode } },
            create: {
              contractId,
              levelCode,
              levelName: level.name.trim(),
            },
            update: { levelName: level.name.trim() },
          });
          const version = await transaction.contractDocumentVersion.create({
            data: {
              contractDocumentId: document.id,
              artifactId: artifact.id,
              versionNumber: 1,
              authorId: ownerId,
            },
          });
          await transaction.contractDocument.update({
            where: { id: document.id },
            data: { currentVersionId: version.id },
          });
        });
        migrated += 1;
      } finally {
        await removeComposerPath(workDir);
      }
    }
  }

  console.log(
    JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      planned,
      migrated,
      skipped,
    })
  );
};

run()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
