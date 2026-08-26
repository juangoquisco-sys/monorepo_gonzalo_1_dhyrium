import { createHash, randomUUID } from 'node:crypto';
import { copyFile, createReadStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { CorporateArchiveCategory } from '@prisma/client';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import CorporateArchiveService from './corporateArchive.service';
import {
  corporateArchiveExtendedSourcePath,
  type CorporateArchiveCategory as ManifestCategory,
  type CorporateArchiveImportManifest,
} from './corporateArchiveImport.domain';
import {
  createCorporateArchiveStagingPath,
  removeCorporateArchiveStagedFile,
} from './corporateArchive.storage';
import { normalizeFolderName } from './corporateArchiveTree.domain';

type ActualRoot = { rootId: string; rootFolderId: string };

const blockLegacySingleScopeApply = (): void => {
  throw new AppError(
    'La importacion requiere un plan multi-scope aprobado con procedencia por item.',
    409,
    'ARCHIVE_IMPORT_MAPPING_REQUIRED'
  );
};

const sourceEntryPath = (sourceRoot: string, sourceRelativePath: string) => {
  if (
    !sourceRelativePath ||
    path.isAbsolute(sourceRelativePath) ||
    sourceRelativePath.split('/').some(part => part === '..' || !part)
  ) {
    throw new AppError('Ruta de manifiesto invalida.', 400, 'ARCHIVE_IMPORT_PATH_INVALID');
  }
  const resolved = path.resolve(sourceRoot, ...sourceRelativePath.split('/'));
  const relative = path.relative(sourceRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError('Ruta de manifiesto fuera de la fuente.', 400, 'ARCHIVE_IMPORT_PATH_INVALID');
  }
  return corporateArchiveExtendedSourcePath(resolved);
};

const sha256File = async (filePath: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
};

const assertScope = async (scopeType: 'COMPANY' | 'CONSORTIUM', scopeId: number) => {
  const scope =
    scopeType === 'COMPANY'
      ? await prisma.companies.findUnique({ where: { id: scopeId }, select: { id: true } })
      : await prisma.consortium.findUnique({ where: { id: scopeId }, select: { id: true } });
  if (!scope) {
    throw new AppError('La empresa o consorcio solicitado no existe.', 404, 'ARCHIVE_SCOPE_NOT_FOUND');
  }
};

const resolveRoot = async (input: {
  scopeType: 'COMPANY' | 'CONSORTIUM';
  scopeId: number;
  actorId: number;
  category: ManifestCategory;
}): Promise<ActualRoot> => {
  const where =
    input.scopeType === 'COMPANY'
      ? {
          companyId_categoryKey: {
            companyId: input.scopeId,
            categoryKey: input.category as CorporateArchiveCategory,
          },
        }
      : {
          consortiumId_categoryKey: {
            consortiumId: input.scopeId,
            categoryKey: input.category as CorporateArchiveCategory,
          },
        };
  const existing = await prisma.corporateArchiveRoot.findUnique({ where });
  if (existing?.rootFolderId) {
    return { rootId: existing.id, rootFolderId: existing.rootFolderId };
  }

  /* Existing service owns root creation and validates the same schema. */
  const resolved = await CorporateArchiveService.resolveRoot(
    { id: input.actorId } as never,
    {
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      categoryKey: input.category,
    }
  );
  return { rootId: resolved.root.id, rootFolderId: resolved.rootFolder.id };
};

const resolveActualRoots = async (input: {
  manifest: CorporateArchiveImportManifest;
  actorId: number;
}) => {
  await assertScope(input.manifest.scope.type, input.manifest.scope.id);
  const references = new Map<string, ActualRoot>();
  for (const category of Object.keys(input.manifest.categoryRoots) as ManifestCategory[]) {
    const actual = await resolveRoot({
      scopeType: input.manifest.scope.type,
      scopeId: input.manifest.scope.id,
      actorId: input.actorId,
      category,
    });
    const planned = input.manifest.categoryRoots[category];
    references.set(planned.rootRef, actual);
    references.set(planned.rootFolderRef, actual);
  }
  return references;
};

const createOrResolveFolder = async (input: {
  rootId: string;
  parentId: string;
  name: string;
  actorId: number;
}) => {
  const nameNormalized = normalizeFolderName(input.name);
  const existing = await prisma.corporateArchiveFolder.findUnique({
    where: {
      rootId_parentId_nameNormalized: {
        rootId: input.rootId,
        parentId: input.parentId,
        nameNormalized,
      },
    },
    select: { id: true, archivedAt: true },
  });
  if (existing?.archivedAt) {
    throw new AppError('La carpeta de importacion esta archivada.', 409, 'ARCHIVE_FOLDER_ARCHIVED');
  }
  if (existing) return existing.id;
  return prisma.corporateArchiveFolder.create({
    data: {
      id: randomUUID(),
      rootId: input.rootId,
      parentId: input.parentId,
      name: input.name,
      nameNormalized,
      createdById: input.actorId,
    },
    select: { id: true },
  }).then(folder => folder.id);
};

const stageVerifiedFile = async (input: {
  sourcePath: string;
  sourceFile: string;
  targetFileRef: string;
  expectedSizeBytes: string;
  expectedSha256: string;
}) => {
  const stagingDirectory = await createCorporateArchiveStagingPath();
  const stagedPath = path.join(stagingDirectory, input.targetFileRef);
  try {
    await mkdir(stagingDirectory, { recursive: true });
    await new Promise<void>((resolve, reject) =>
      copyFile(input.sourcePath, stagedPath, error => (error ? reject(error) : resolve()))
    );
    const stagedStats = await stat(stagedPath);
    const stagedHash = await sha256File(stagedPath);
    if (
      stagedStats.size.toString() !== input.expectedSizeBytes ||
      stagedHash !== input.expectedSha256
    ) {
      throw new AppError(
        `La fuente cambio durante la importacion: ${input.sourceFile}`,
        409,
        'ARCHIVE_IMPORT_SOURCE_CHANGED'
      );
    }
    return { stagedPath, stagingDirectory };
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
};

export const applyCorporateArchiveImport = async (input: {
  manifest: CorporateArchiveImportManifest;
  manifestSha256: string;
  actorId: number;
  resume: boolean;
}) => {
  blockLegacySingleScopeApply();
  if (input.manifest.actorId !== input.actorId) {
    throw new AppError('El actor no coincide con el manifiesto aprobado.', 409, 'ARCHIVE_IMPORT_ACTOR_MISMATCH');
  }
  const rootReferences = await resolveActualRoots(input);
  const folderReferences = new Map<string, string>();
  let foldersCreated = 0;
  let foldersExisting = 0;
  for (const folder of input.manifest.folders) {
    const root = rootReferences.get(input.manifest.categoryRoots[folder.category].rootRef);
    const parentId = folderReferences.get(folder.parentTargetFolderRef) ||
      rootReferences.get(folder.parentTargetFolderRef)?.rootFolderId;
    if (!root || !parentId) {
      throw new AppError('Referencia de carpeta no resoluble.', 409, 'ARCHIVE_IMPORT_REFERENCE_INVALID');
    }
    const existing = await prisma.corporateArchiveFolder.findUnique({
      where: {
        rootId_parentId_nameNormalized: {
          rootId: root.rootId,
          parentId,
          nameNormalized: normalizeFolderName(folder.name),
        },
      },
      select: { id: true },
    });
    const actualId = await createOrResolveFolder({
      rootId: root.rootId,
      parentId,
      name: folder.name,
      actorId: input.actorId,
    });
    folderReferences.set(folder.targetFolderRef, actualId);
    if (existing) foldersExisting += 1;
    else foldersCreated += 1;
  }

  let filesCreated = 0;
  let filesExisting = 0;
  let filesSkippedTemporary = 0;
  for (const file of input.manifest.files) {
    if (file.status === 'SKIPPED_TEMPORARY') {
      filesSkippedTemporary += 1;
      continue;
    }
    const root = rootReferences.get(input.manifest.categoryRoots[file.category].rootRef);
    const folderId = folderReferences.get(file.targetFolderRef) ||
      rootReferences.get(file.targetFolderRef)?.rootFolderId;
    if (!root || !folderId) {
      throw new AppError('Referencia de archivo no resoluble.', 409, 'ARCHIVE_IMPORT_REFERENCE_INVALID');
    }
    const existing = await prisma.corporateArchiveDocument.findFirst({
      where: { rootId: root.rootId, folderId, displayName: file.originalName },
      select: { id: true, currentVersion: { select: { sha256: true } } },
    });
    if (existing?.currentVersion?.sha256 === file.sha256) {
      filesExisting += 1;
      continue;
    }
    if (existing) {
      throw new AppError(
        `Documento existente distinto: ${file.sourceFile}`,
        409,
        'ARCHIVE_IMPORT_DOCUMENT_CONFLICT'
      );
    }
    const staged = await stageVerifiedFile({
      sourcePath: sourceEntryPath(input.manifest.sourceRoot, file.sourceFile),
      sourceFile: file.sourceFile,
      targetFileRef: file.targetFileRef,
      expectedSizeBytes: file.sizeBytes,
      expectedSha256: file.sha256,
    });
    try {
      await CorporateArchiveService.createDocuments(
        { id: input.actorId } as never,
        folderId,
        [
          {
            path: staged.stagedPath,
            originalname: file.originalName,
            mimetype: file.mimeType,
            size: Number(file.sizeBytes),
          },
        ],
        file.originalName
      );
      filesCreated += 1;
    } finally {
      await removeCorporateArchiveStagedFile(staged.stagedPath);
      await rm(staged.stagingDirectory, { recursive: true, force: true });
    }
  }
  return {
    mode: input.resume ? 'resume' : 'apply',
    manifestSha256: input.manifestSha256,
    rootsResolved: rootReferences.size / 2,
    folders: { created: foldersCreated, existing: foldersExisting },
    files: {
      created: filesCreated,
      existing: filesExisting,
      skippedTemporary: filesSkippedTemporary,
    },
  };
};
