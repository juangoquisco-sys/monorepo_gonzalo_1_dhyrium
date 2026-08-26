import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  CorporateArchiveCategory,
  CorporateArchiveDocumentStatus,
  CorporateArchiveScopeType,
  Prisma,
} from '@prisma/client';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import {
  collectFolderDescendants,
  folderIdsForArchiveOperation,
  assertFolderMove,
  buildFolderTree,
  buildBreadcrumbs,
  normalizeFolderName,
  type ArchiveFolderNode,
} from './corporateArchiveTree.domain';
import {
  persistCorporateArchiveFile,
  removeCorporateArchiveFile,
  removeCorporateArchiveStagedFile,
  resolveCorporateArchiveStoragePath,
} from './corporateArchive.storage';
import type {
  CorporateArchiveCategory as CategoryInput,
  CorporateArchiveScope,
} from './corporateArchive.schema';

type UploadedFile = Pick<
  Express.Multer.File,
  'path' | 'originalname' | 'mimetype' | 'size'
>;

const folderSelect = {
  id: true,
  rootId: true,
  parentId: true,
  name: true,
  nameNormalized: true,
  isRoot: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CorporateArchiveFolderSelect;

const versionSelect = {
  id: true,
  version: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  createdAt: true,
  uploadedById: true,
} satisfies Prisma.CorporateArchiveDocumentVersionSelect;

const documentSelect = {
  id: true,
  rootId: true,
  folderId: true,
  displayName: true,
  status: true,
  currentVersionId: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  currentVersion: { select: versionSelect },
} satisfies Prisma.CorporateArchiveDocumentSelect;

const serializeVersion = <T extends { sizeBytes: bigint }>(version: T) => ({
  ...version,
  sizeBytes: version.sizeBytes.toString(),
});

const serializeDocument = <
  T extends { currentVersion: { sizeBytes: bigint } | null }
>(
  document: T
) => ({
  ...document,
  currentVersion: document.currentVersion
    ? serializeVersion(document.currentVersion)
    : null,
});

const TRANSACTION_RETRIES = 3;

const isRetryableTransactionError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2034' || error.code === 'P2002');

const withSerializableRetry = async <T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await (prisma.$transaction(operation as never, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }) as Promise<T>);
    } catch (error) {
      lastError = error;
      if (
        !isRetryableTransactionError(error) ||
        attempt === TRANSACTION_RETRIES - 1
      ) {
        throw error;
      }
    }
  }
  throw lastError;
};

class CorporateArchiveService {
  static categories() {
    return [
      ['IDENTITY', 'Identidad', 'Documentos de identidad corporativa.'],
      ['MANAGEMENT', 'Gestión', 'Planeamiento, dirección y seguimiento.'],
      [
        'ADMINISTRATION',
        'Administración',
        'Administración interna y financiera.',
      ],
      ['PEOPLE', 'Personas', 'Información laboral y de personas.'],
      ['COMMERCIAL', 'Comercial', 'Propuestas, ventas y clientes.'],
      ['COMPLIANCE', 'Cumplimiento', 'Obligaciones regulatorias y controles.'],
      ['EXPERIENCE', 'Experiencia', 'Antecedentes, portafolio y experiencia.'],
      ['CONTRACTS', 'Contratos', 'Contratos y documentación contractual.'],
    ].map(([key, label, description]) => ({
      key: key as CorporateArchiveCategory,
      label,
      description,
    }));
  }

  private static async assertScope(
    scopeType: CorporateArchiveScope,
    scopeId: number
  ) {
    const exists =
      scopeType === 'COMPANY'
        ? await prisma.companies.findUnique({
            where: { id: scopeId },
            select: { id: true },
          })
        : await prisma.consortium.findUnique({
            where: { id: scopeId },
            select: { id: true },
          });
    if (!exists)
      throw new AppError(
        'La empresa o consorcio solicitado no existe.',
        404,
        'ARCHIVE_SCOPE_NOT_FOUND'
      );
  }

  private static async getRoot(rootId: string) {
    const root = await prisma.corporateArchiveRoot.findUnique({
      where: { id: rootId },
      include: { rootFolder: { select: folderSelect } },
    });
    if (!root?.rootFolder)
      throw new AppError(
        'La raíz documental no existe o está incompleta.',
        404,
        'ARCHIVE_ROOT_NOT_FOUND'
      );
    return root;
  }

  static async resolveRoot(
    actor: UserType,
    input: {
      scopeType: CorporateArchiveScope;
      scopeId: number;
      categoryKey: CategoryInput;
    }
  ) {
    await this.assertScope(input.scopeType, input.scopeId);
    const where =
      input.scopeType === 'COMPANY'
        ? {
            companyId_categoryKey: {
              companyId: input.scopeId,
              categoryKey: input.categoryKey as CorporateArchiveCategory,
            },
          }
        : {
            consortiumId_categoryKey: {
              consortiumId: input.scopeId,
              categoryKey: input.categoryKey as CorporateArchiveCategory,
            },
          };
    const scopeType = input.scopeType as CorporateArchiveScopeType;
    return withSerializableRetry(async transaction => {
      const existing = await transaction.corporateArchiveRoot.findUnique({
        where,
        include: { rootFolder: { select: folderSelect } },
      });
      if (existing?.rootFolder)
        return {
          root: existing,
          rootFolder: existing.rootFolder,
          created: false,
        };
      if (existing)
        throw new AppError(
          'La raíz documental está incompleta.',
          409,
          'ARCHIVE_ROOT_INCOMPLETE'
        );
      const rootId = randomUUID();
      const rootFolderId = randomUUID();
      await transaction.corporateArchiveRoot.create({
        data: {
          id: rootId,
          scopeType,
          categoryKey: input.categoryKey as CorporateArchiveCategory,
          companyId: input.scopeType === 'COMPANY' ? input.scopeId : null,
          consortiumId: input.scopeType === 'CONSORTIUM' ? input.scopeId : null,
          createdById: actor.id,
        },
      });
      const rootFolder = await transaction.corporateArchiveFolder.create({
        data: {
          id: rootFolderId,
          rootId,
          name: input.categoryKey,
          nameNormalized: normalizeFolderName(input.categoryKey),
          isRoot: true,
          createdById: actor.id,
        },
        select: folderSelect,
      });
      const root = await transaction.corporateArchiveRoot.update({
        where: { id: rootId },
        data: { rootFolderId },
        include: { rootFolder: { select: folderSelect } },
      });
      return { root, rootFolder, created: true };
    });
  }

  static async tree(rootId: string, includeArchived: boolean) {
    const root = await this.getRoot(rootId);
    const folders = await prisma.corporateArchiveFolder.findMany({
      where: { rootId, ...(includeArchived ? {} : { archivedAt: null }) },
      select: folderSelect,
      orderBy: { name: 'asc' },
    });
    const documents = await prisma.corporateArchiveDocument.findMany({
      where: {
        rootId,
        ...(includeArchived
          ? {}
          : { status: CorporateArchiveDocumentStatus.ACTIVE }),
      },
      select: documentSelect,
      orderBy: { displayName: 'asc' },
    });
    return {
      root,
      tree: buildFolderTree(
        folders as ArchiveFolderNode[],
        documents.map(serializeDocument)
      ),
    };
  }

  static async contents(
    rootId: string,
    input: {
      folderId?: string;
      recursive: boolean;
      includeArchived: boolean;
      q?: string;
    }
  ) {
    const root = await this.getRoot(rootId);
    const rootFolder = root.rootFolder;
    if (!rootFolder)
      throw new AppError(
        'La raíz documental está incompleta.',
        409,
        'ARCHIVE_ROOT_INCOMPLETE'
      );
    const folderId = input.folderId || rootFolder.id;
    const folder = await prisma.corporateArchiveFolder.findFirst({
      where: { id: folderId, rootId },
      select: folderSelect,
    });
    if (!folder)
      throw new AppError(
        'La carpeta no pertenece a la raíz indicada.',
        404,
        'ARCHIVE_FOLDER_NOT_FOUND'
      );
    const nameFilter = input.q
      ? { contains: input.q, mode: 'insensitive' as const }
      : undefined;
    if (!input.recursive) {
      const [allFolders, folders, documents] = await Promise.all([
        prisma.corporateArchiveFolder.findMany({
          where: { rootId },
          select: folderSelect,
        }),
        prisma.corporateArchiveFolder.findMany({
          where: {
            rootId,
            parentId: folderId,
            isRoot: false,
            ...(input.includeArchived ? {} : { archivedAt: null }),
            name: nameFilter,
          },
          select: folderSelect,
          orderBy: { name: 'asc' },
        }),
        prisma.corporateArchiveDocument.findMany({
          where: {
            rootId,
            folderId,
            ...(input.includeArchived
              ? {}
              : { status: CorporateArchiveDocumentStatus.ACTIVE }),
            displayName: nameFilter,
          },
          select: documentSelect,
          orderBy: { displayName: 'asc' },
        }),
      ]);
      return {
        root,
        folder,
        breadcrumbs: buildBreadcrumbs(
          allFolders as ArchiveFolderNode[],
          folderId
        ),
        folders,
        documents: documents.map(serializeDocument),
        recursive: false,
      };
    }
    const allFolders = await prisma.corporateArchiveFolder.findMany({
      where: { rootId },
      select: folderSelect,
      orderBy: { name: 'asc' },
    });
    const descendantIds = collectFolderDescendants(allFolders, folderId);
    const visibleFolderIds = new Set(
      input.includeArchived
        ? descendantIds
        : allFolders
            .filter(item => descendantIds.includes(item.id) && !item.archivedAt)
            .map(item => item.id)
    );
    const documents = await prisma.corporateArchiveDocument.findMany({
      where: {
        rootId,
        folderId: { in: [...visibleFolderIds] },
        ...(input.includeArchived
          ? {}
          : { status: CorporateArchiveDocumentStatus.ACTIVE }),
        ...(input.q ? { displayName: nameFilter } : {}),
      },
      select: documentSelect,
      orderBy: { displayName: 'asc' },
    });
    return {
      root,
      folder,
      breadcrumbs: buildBreadcrumbs(
        allFolders as ArchiveFolderNode[],
        folderId
      ),
      folders: allFolders.filter(item => visibleFolderIds.has(item.id)),
      documents: documents.map(serializeDocument),
      tree: buildFolderTree(
        allFolders.filter(item =>
          visibleFolderIds.has(item.id)
        ) as ArchiveFolderNode[],
        documents.map(serializeDocument)
      ),
      recursive: true,
    };
  }

  static async createFolder(
    actor: UserType,
    rootId: string,
    input: { parentId?: string; name: string }
  ) {
    const root = await this.getRoot(rootId);
    const rootFolder = root.rootFolder;
    if (!rootFolder)
      throw new AppError(
        'La raíz documental está incompleta.',
        409,
        'ARCHIVE_ROOT_INCOMPLETE'
      );
    const parentId = input.parentId || rootFolder.id;
    const parent = await prisma.corporateArchiveFolder.findFirst({
      where: { id: parentId, rootId },
      select: { id: true, archivedAt: true },
    });
    if (!parent)
      throw new AppError(
        'La carpeta padre no pertenece a la raíz indicada.',
        404,
        'ARCHIVE_FOLDER_NOT_FOUND'
      );
    if (parent.archivedAt)
      throw new AppError(
        'No se puede crear contenido dentro de una carpeta archivada.',
        409,
        'ARCHIVE_FOLDER_ARCHIVED'
      );
    const nameNormalized = normalizeFolderName(input.name);
    const duplicate = await prisma.corporateArchiveFolder.findFirst({
      where: { rootId, parentId, nameNormalized },
      select: { id: true },
    });
    if (duplicate)
      throw new AppError(
        'Ya existe una carpeta con ese nombre.',
        409,
        'ARCHIVE_FOLDER_NAME_DUPLICATE'
      );
    return prisma.corporateArchiveFolder.create({
      data: {
        rootId,
        parentId,
        name: input.name.trim().replace(/\s+/g, ' '),
        nameNormalized,
        createdById: actor.id,
      },
      select: folderSelect,
    });
  }

  static async renameFolder(id: string, name: string) {
    const folder = await prisma.corporateArchiveFolder.findUnique({
      where: { id },
      select: {
        id: true,
        rootId: true,
        parentId: true,
        isRoot: true,
        archivedAt: true,
      },
    });
    if (!folder)
      throw new AppError(
        'Carpeta no encontrada.',
        404,
        'ARCHIVE_FOLDER_NOT_FOUND'
      );
    if (folder.isRoot)
      throw new AppError(
        'La carpeta raíz no se puede renombrar.',
        422,
        'ARCHIVE_ROOT_FOLDER_IMMUTABLE'
      );
    if (folder.archivedAt)
      throw new AppError(
        'No se puede renombrar una carpeta archivada.',
        409,
        'ARCHIVE_FOLDER_ARCHIVED'
      );
    const nameNormalized = normalizeFolderName(name);
    const duplicate = await prisma.corporateArchiveFolder.findFirst({
      where: {
        rootId: folder.rootId,
        parentId: folder.parentId,
        nameNormalized,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate)
      throw new AppError(
        'Ya existe una carpeta con ese nombre.',
        409,
        'ARCHIVE_FOLDER_NAME_DUPLICATE'
      );
    return prisma.corporateArchiveFolder.update({
      where: { id },
      data: { name: name.trim().replace(/\s+/g, ' '), nameNormalized },
      select: folderSelect,
    });
  }

  static async moveFolder(id: string, targetFolderId: string) {
    const folder = await prisma.corporateArchiveFolder.findUnique({
      where: { id },
      select: { id: true, rootId: true, isRoot: true, archivedAt: true },
    });
    const target = await prisma.corporateArchiveFolder.findUnique({
      where: { id: targetFolderId },
      select: { id: true, rootId: true, archivedAt: true },
    });
    if (!folder || !target || folder.rootId !== target.rootId)
      throw new AppError(
        'La carpeta destino no pertenece a la misma raíz.',
        404,
        'ARCHIVE_FOLDER_NOT_FOUND'
      );
    if (folder.archivedAt || target.archivedAt)
      throw new AppError(
        'No se pueden mover carpetas archivadas.',
        409,
        'ARCHIVE_FOLDER_ARCHIVED'
      );
    const folders = await prisma.corporateArchiveFolder.findMany({
      where: { rootId: folder.rootId },
      select: { id: true, parentId: true },
    });
    const root = await this.getRoot(folder.rootId);
    const rootFolder = root.rootFolder;
    if (!rootFolder)
      throw new AppError(
        'La raíz documental está incompleta.',
        409,
        'ARCHIVE_ROOT_INCOMPLETE'
      );
    assertFolderMove({
      folderId: id,
      targetFolderId,
      rootFolderId: rootFolder.id,
      descendantIds: collectFolderDescendants(folders, id),
    });
    const source = await prisma.corporateArchiveFolder.findUnique({
      where: { id },
      select: { nameNormalized: true },
    });
    const duplicate = await prisma.corporateArchiveFolder.findFirst({
      where: {
        rootId: folder.rootId,
        parentId: targetFolderId,
        nameNormalized: source!.nameNormalized,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate)
      throw new AppError(
        'Ya existe una carpeta con ese nombre en el destino.',
        409,
        'ARCHIVE_FOLDER_NAME_DUPLICATE'
      );
    return prisma.corporateArchiveFolder.update({
      where: { id },
      data: { parentId: targetFolderId },
      select: folderSelect,
    });
  }

  static async setFolderArchived(
    actor: UserType,
    id: string,
    archived: boolean
  ) {
    const folder = await prisma.corporateArchiveFolder.findUnique({
      where: { id },
      select: { id: true, rootId: true, isRoot: true, archivedAt: true },
    });
    if (!folder)
      throw new AppError(
        'Carpeta no encontrada.',
        404,
        'ARCHIVE_FOLDER_NOT_FOUND'
      );
    if (folder.isRoot)
      throw new AppError(
        'La carpeta raíz no se puede archivar.',
        422,
        'ARCHIVE_ROOT_FOLDER_IMMUTABLE'
      );
    if (!archived) {
      const parent = await prisma.corporateArchiveFolder.findUnique({
        where: { id },
        select: { parent: { select: { archivedAt: true } } },
      });
      if (parent?.parent?.archivedAt)
        throw new AppError(
          'Restaura primero la carpeta padre.',
          409,
          'ARCHIVE_FOLDER_PARENT_ARCHIVED'
        );
    }
    await withSerializableRetry(async transaction => {
      const current = await transaction.corporateArchiveFolder.findUnique({
        where: { id },
        select: {
          id: true,
          rootId: true,
          isRoot: true,
          archivedAt: true,
          archiveOperationId: true,
          parent: { select: { archivedAt: true } },
        },
      });
      if (!current)
        throw new AppError(
          'Carpeta no encontrada.',
          404,
          'ARCHIVE_FOLDER_NOT_FOUND'
        );
      if (current.isRoot)
        throw new AppError(
          'La raÃ­z no se puede archivar.',
          422,
          'ARCHIVE_ROOT_FOLDER_IMMUTABLE'
        );
      if (!archived && current.parent?.archivedAt)
        throw new AppError(
          'Restaura primero la carpeta padre.',
          409,
          'ARCHIVE_FOLDER_PARENT_ARCHIVED'
        );
      if (archived === Boolean(current.archivedAt)) return;

      const folders = await transaction.corporateArchiveFolder.findMany({
        where: { rootId: current.rootId },
        select: { id: true, parentId: true, archiveOperationId: true },
      });
      const descendantIds = collectFolderDescendants(folders, id);
      if (archived) {
        const archiveOperationId = randomUUID();
        const now = new Date();
        await transaction.corporateArchiveFolder.updateMany({
          where: { id: { in: descendantIds }, archivedAt: null },
          data: { archivedAt: now, archivedById: actor.id, archiveOperationId },
        });
        await transaction.corporateArchiveDocument.updateMany({
          where: {
            folderId: { in: descendantIds },
            status: CorporateArchiveDocumentStatus.ACTIVE,
          },
          data: {
            status: CorporateArchiveDocumentStatus.ARCHIVED,
            archivedAt: now,
            archivedById: actor.id,
            archiveOperationId,
          },
        });
        return;
      }

      if (!current.archiveOperationId) {
        throw new AppError(
          'La carpeta archivada no tiene una operaciÃ³n de restauraciÃ³n segura.',
          409,
          'ARCHIVE_FOLDER_RESTORE_OPERATION_UNKNOWN'
        );
      }
      const restoredFolderIds = folderIdsForArchiveOperation(
        folders.filter(folder => descendantIds.includes(folder.id)),
        current.archiveOperationId
      );
      await transaction.corporateArchiveFolder.updateMany({
        where: {
          id: { in: restoredFolderIds },
          archiveOperationId: current.archiveOperationId,
        },
        data: {
          archivedAt: null,
          archivedById: null,
          archiveOperationId: null,
        },
      });
      await transaction.corporateArchiveDocument.updateMany({
        where: {
          folderId: { in: descendantIds },
          archiveOperationId: current.archiveOperationId,
        },
        data: {
          status: CorporateArchiveDocumentStatus.ACTIVE,
          archivedAt: null,
          archivedById: null,
          archiveOperationId: null,
        },
      });
    });
    return { id, archived };
  }

  static async createDocuments(
    actor: UserType,
    folderId: string,
    files: UploadedFile[],
    displayName?: string
  ) {
    const folder = await prisma.corporateArchiveFolder.findUnique({
      where: { id: folderId },
      select: { id: true, rootId: true, archivedAt: true },
    });
    if (!folder)
      throw new AppError(
        'Carpeta no encontrada.',
        404,
        'ARCHIVE_FOLDER_NOT_FOUND'
      );
    if (folder.archivedAt)
      throw new AppError(
        'No se pueden cargar archivos en una carpeta archivada.',
        409,
        'ARCHIVE_FOLDER_ARCHIVED'
      );
    if (!files.length)
      throw new AppError(
        'Adjunte al menos un archivo.',
        400,
        'ARCHIVE_UPLOAD_EMPTY'
      );
    const pending = files.map(file => ({
      file,
      documentId: randomUUID(),
      versionId: randomUUID(),
    }));
    const persisted: Array<
      (typeof pending)[number] & { storageKey: string; sha256: string }
    > = [];
    try {
      for (const item of pending) {
        const stored = await persistCorporateArchiveFile({
          stagedPath: item.file.path,
          rootId: folder.rootId,
          documentId: item.documentId,
          versionId: item.versionId,
          originalName: item.file.originalname,
        });
        persisted.push({
          ...item,
          storageKey: stored.storageKey,
          sha256: stored.sha256,
        });
      }
      const created = await withSerializableRetry(async transaction => {
        const currentFolder =
          await transaction.corporateArchiveFolder.findUnique({
            where: { id: folderId },
            select: { id: true, rootId: true, archivedAt: true },
          });
        if (!currentFolder)
          throw new AppError(
            'Carpeta no encontrada.',
            404,
            'ARCHIVE_FOLDER_NOT_FOUND'
          );
        if (
          currentFolder.rootId !== folder.rootId ||
          currentFolder.archivedAt
        ) {
          throw new AppError(
            'No se pueden cargar archivos en una carpeta archivada.',
            409,
            'ARCHIVE_FOLDER_ARCHIVED'
          );
        }
        const documents = [];
        for (const item of persisted) {
          await transaction.corporateArchiveDocument.create({
            data: {
              id: item.documentId,
              rootId: folder.rootId,
              folderId,
              displayName: displayName || item.file.originalname,
              createdById: actor.id,
            },
          });
          await transaction.corporateArchiveDocumentVersion.create({
            data: {
              id: item.versionId,
              documentId: item.documentId,
              version: 1,
              storageKey: item.storageKey,
              originalName: item.file.originalname,
              mimeType: item.file.mimetype || 'application/octet-stream',
              sizeBytes: BigInt(item.file.size),
              sha256: item.sha256,
              uploadedById: actor.id,
            },
          });
          documents.push(
            await transaction.corporateArchiveDocument.update({
              where: { id: item.documentId },
              data: { currentVersionId: item.versionId },
              select: documentSelect,
            })
          );
        }
        return documents;
      });
      return created.map(serializeDocument);
    } catch (error) {
      await Promise.allSettled(
        persisted.map(item => removeCorporateArchiveFile(item.storageKey))
      );
      await Promise.allSettled(
        files.map(file => removeCorporateArchiveStagedFile(file.path))
      );
      throw error;
    }
  }

  static async documentVersions(id: string) {
    const document = await prisma.corporateArchiveDocument.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!document)
      throw new AppError(
        'Documento no encontrado.',
        404,
        'ARCHIVE_DOCUMENT_NOT_FOUND'
      );
    const versions = await prisma.corporateArchiveDocumentVersion.findMany({
      where: { documentId: id },
      select: versionSelect,
      orderBy: { version: 'desc' },
    });
    return { documentId: id, versions: versions.map(serializeVersion) };
  }

  static async createVersion(
    actor: UserType,
    id: string,
    file: UploadedFile | undefined,
    expectedCurrentVersionId: string
  ) {
    if (!file)
      throw new AppError('Adjunte un archivo.', 400, 'ARCHIVE_UPLOAD_EMPTY');
    const document = await prisma.corporateArchiveDocument.findUnique({
      where: { id },
      select: {
        id: true,
        rootId: true,
        folder: { select: { archivedAt: true } },
        status: true,
        currentVersionId: true,
        _count: { select: { versions: true } },
      },
    });
    if (!document)
      throw new AppError(
        'Documento no encontrado.',
        404,
        'ARCHIVE_DOCUMENT_NOT_FOUND'
      );
    if (
      document.status === CorporateArchiveDocumentStatus.ARCHIVED ||
      document.folder.archivedAt
    )
      throw new AppError(
        'No se puede versionar un documento archivado.',
        409,
        'ARCHIVE_DOCUMENT_ARCHIVED'
      );
    if (expectedCurrentVersionId !== document.currentVersionId)
      throw new AppError(
        'El documento cambió mientras lo editabas.',
        409,
        'ARCHIVE_VERSION_CONFLICT'
      );
    const versionId = randomUUID();
    let persisted: { storageKey: string; sha256: string } | null = null;
    try {
      persisted = await persistCorporateArchiveFile({
        stagedPath: file.path,
        rootId: document.rootId,
        documentId: id,
        versionId,
        originalName: file.originalname,
      });
      const version = await withSerializableRetry(async transaction => {
        const current = await transaction.corporateArchiveDocument.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            currentVersionId: true,
            folder: { select: { archivedAt: true } },
            _count: { select: { versions: true } },
          },
        });
        if (!current)
          throw new AppError(
            'Documento no encontrado.',
            404,
            'ARCHIVE_DOCUMENT_NOT_FOUND'
          );
        if (
          current.status === CorporateArchiveDocumentStatus.ARCHIVED ||
          current.folder.archivedAt
        )
          throw new AppError(
            'Document version is no longer available.',
            409,
            'ARCHIVE_DOCUMENT_ARCHIVED'
          );
        if (expectedCurrentVersionId !== current.currentVersionId)
          throw new AppError(
            'Document version changed concurrently.',
            409,
            'ARCHIVE_VERSION_CONFLICT'
          );
        const created =
          await transaction.corporateArchiveDocumentVersion.create({
            data: {
              id: versionId,
              documentId: id,
              version: current._count.versions + 1,
              storageKey: persisted!.storageKey,
              originalName: file.originalname,
              mimeType: file.mimetype || 'application/octet-stream',
              sizeBytes: BigInt(file.size),
              sha256: persisted!.sha256,
              uploadedById: actor.id,
            },
            select: versionSelect,
          });
        await transaction.corporateArchiveDocument.update({
          where: { id },
          data: { currentVersionId: versionId },
        });
        return created;
      });
      return serializeVersion(version);
    } catch (error) {
      if (persisted) await removeCorporateArchiveFile(persisted.storageKey);
      await removeCorporateArchiveStagedFile(file.path);
      throw error;
    }
  }

  static async moveDocument(id: string, targetFolderId: string) {
    return withSerializableRetry(async transaction => {
      const document = await transaction.corporateArchiveDocument.findUnique({
        where: { id },
        select: { id: true, rootId: true, status: true },
      });
      const target = await transaction.corporateArchiveFolder.findUnique({
        where: { id: targetFolderId },
        select: { id: true, rootId: true, archivedAt: true },
      });
      if (!document || !target || document.rootId !== target.rootId)
        throw new AppError(
          'La carpeta destino no pertenece a la misma raíz.',
          404,
          'ARCHIVE_FOLDER_NOT_FOUND'
        );
      if (
        document.status === CorporateArchiveDocumentStatus.ARCHIVED ||
        target.archivedAt
      )
        throw new AppError(
          'No se pueden mover documentos archivados.',
          409,
          'ARCHIVE_DOCUMENT_ARCHIVED'
        );
      return transaction.corporateArchiveDocument
        .update({
          where: { id },
          data: { folderId: targetFolderId },
          select: documentSelect,
        })
        .then(serializeDocument);
    });
  }

  static async setDocumentArchived(
    actor: UserType,
    id: string,
    archived: boolean
  ) {
    return withSerializableRetry(async transaction => {
      const document = await transaction.corporateArchiveDocument.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          folder: { select: { archivedAt: true } },
        },
      });
      if (!document)
        throw new AppError(
          'Documento no encontrado.',
          404,
          'ARCHIVE_DOCUMENT_NOT_FOUND'
        );
      if (!archived && document.folder.archivedAt)
        throw new AppError(
          'Restaura primero la carpeta padre.',
          409,
          'ARCHIVE_FOLDER_PARENT_ARCHIVED'
        );
      if (
        archived ===
        (document.status === CorporateArchiveDocumentStatus.ARCHIVED)
      ) {
        return transaction.corporateArchiveDocument
          .findUniqueOrThrow({ where: { id }, select: documentSelect })
          .then(serializeDocument);
      }
      return transaction.corporateArchiveDocument
        .update({
          where: { id },
          data: {
            status: archived
              ? CorporateArchiveDocumentStatus.ARCHIVED
              : CorporateArchiveDocumentStatus.ACTIVE,
            archivedAt: archived ? new Date() : null,
            archivedById: archived ? actor.id : null,
            archiveOperationId: archived ? randomUUID() : null,
          },
          select: documentSelect,
        })
        .then(serializeDocument);
    });
  }

  static async download(id: string) {
    const document = await prisma.corporateArchiveDocument.findUnique({
      where: { id },
      select: {
        status: true,
        currentVersion: {
          select: { storageKey: true, originalName: true, mimeType: true },
        },
      },
    });
    if (
      !document?.currentVersion ||
      document.status === CorporateArchiveDocumentStatus.ARCHIVED
    )
      throw new AppError(
        'Documento no disponible.',
        404,
        'ARCHIVE_DOCUMENT_NOT_FOUND'
      );
    const absolutePath = resolveCorporateArchiveStoragePath(
      document.currentVersion.storageKey
    );
    if (!existsSync(absolutePath))
      throw new AppError(
        'El archivo ya no está disponible.',
        404,
        'ARCHIVE_FILE_NOT_FOUND'
      );
    return { ...document.currentVersion, absolutePath };
  }
}

export default CorporateArchiveService;
