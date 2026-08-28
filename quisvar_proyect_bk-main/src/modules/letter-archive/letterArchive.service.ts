import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { persistLetterArchiveFile, removeLetterArchiveStagedFile, resolveLetterArchiveFile } from './letterArchive.storage';

type Upload = Pick<Express.Multer.File, 'path' | 'originalname' | 'mimetype' | 'size'>;
type LetterRecordInput = { code: string; type: string; recordType: string; date: Date; entity: string; location: string; subject: string; status: string; content: string };

const folderTree = (folders: Array<{ id: string; parentId: string | null; name: string }>, documents: Array<{ id: string; folderId: string; displayName: string; originalName: string; mimeType: string; sizeBytes: bigint }>, parentId: string | null = null): unknown[] =>
  folders.filter(folder => folder.parentId === parentId).map(folder => ({
    ...folder,
    documents: documents.filter(document => document.folderId === folder.id).map(document => ({ ...document, sizeBytes: document.sizeBytes.toString() })),
    children: folderTree(folders, documents, folder.id),
  }));

const ensureDocumentFolders = async (db: Prisma.TransactionClient, rootId: string, documentCode: string) => {
  const firstTitle = await db.letterArchiveFolder.findFirst({ where: { rootId, parentId: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  const title = firstTitle
    ? await db.letterArchiveFolder.update({ where: { id: firstTitle.id }, data: { name: documentCode } })
    : await db.letterArchiveFolder.create({ data: { rootId, name: documentCode, sortOrder: 0 } });
  const firstSubtitle = await db.letterArchiveFolder.findFirst({ where: { rootId, parentId: title.id }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  if (firstSubtitle) await db.letterArchiveFolder.update({ where: { id: firstSubtitle.id }, data: { name: documentCode } });
  else await db.letterArchiveFolder.create({ data: { rootId, parentId: title.id, name: documentCode, sortOrder: 0 } });
  const annexes = await db.letterArchiveFolder.findFirst({ where: { rootId, parentId: title.id, name: 'Anexos' }, select: { id: true } });
  if (!annexes) await db.letterArchiveFolder.create({ data: { rootId, parentId: title.id, name: 'Anexos', sortOrder: 1 } });
};

const toRecord = (root: { id: string; documentCode: string; documentType: string; recordType: string; documentDate: Date | null; entity: string; location: string; subject: string; status: string; content: string; versionNumber: number; updatedAt: Date }) => ({
  id: root.id,
  code: root.documentCode,
  type: root.documentType,
  recordType: root.recordType,
  date: root.documentDate?.toISOString().slice(0, 10) ?? '',
  entity: root.entity,
  location: root.location,
  subject: root.subject,
  status: root.status,
  content: root.content,
  versionNumber: root.versionNumber,
  updatedAt: root.updatedAt,
});

class LetterArchiveService {
  static async resolveRoot(companyId: number, documentCode: string) {
    const company = await prisma.companies.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new AppError('Empresa no encontrada.', 404, 'LETTER_ARCHIVE_COMPANY_NOT_FOUND');
    const root = await prisma.letterArchiveRoot.upsert({
      where: { companyId_documentCode: { companyId, documentCode } },
      create: { companyId, documentCode },
      update: {},
    });
    await prisma.$transaction(tx => ensureDocumentFolders(tx as unknown as Prisma.TransactionClient, root.id, documentCode));
    return root;
  }

  static async tree(rootId: string) {
    const root = await prisma.letterArchiveRoot.findUnique({
      where: { id: rootId },
      include: { folders: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }, documents: { orderBy: { createdAt: 'asc' } } },
    });
    if (!root) throw new AppError('Registro de archivos no encontrado.', 404, 'LETTER_ARCHIVE_ROOT_NOT_FOUND');
    return { root: { id: root.id, companyId: root.companyId, documentCode: root.documentCode }, folders: folderTree(root.folders, root.documents) };
  }

  static async listRecords(companyId: number) {
    const roots = await prisma.letterArchiveRoot.findMany({ where: { companyId, versionNumber: { gt: 0 } }, orderBy: { updatedAt: 'desc' } });
    return roots.map(toRecord);
  }

  static async getRecord(companyId: number, rootId: string) {
    const root = await prisma.letterArchiveRoot.findFirst({ where: { id: rootId, companyId }, include: { versions: { orderBy: { versionNumber: 'desc' } } } });
    if (!root) throw new AppError('Carta no encontrada.', 404, 'LETTER_ARCHIVE_RECORD_NOT_FOUND');
    return {
      record: toRecord(root),
      versions: root.versions.map(version => ({ id: version.id, versionNumber: version.versionNumber, code: version.documentCode, date: version.documentDate?.toISOString().slice(0, 10) ?? '', subject: version.subject, content: version.content, createdAt: version.createdAt })),
    };
  }

  static async saveRecord(companyId: number, rootId: string, input: LetterRecordInput) {
    const root = await prisma.$transaction(async tx => {
      const existing = await tx.letterArchiveRoot.findFirst({ where: { id: rootId, companyId } });
      if (!existing) throw new AppError('Carta no encontrada.', 404, 'LETTER_ARCHIVE_RECORD_NOT_FOUND');
      if (existing.documentCode !== input.code) {
        const duplicate = await tx.letterArchiveRoot.findFirst({ where: { companyId, documentCode: input.code, id: { not: rootId } }, select: { id: true } });
        if (duplicate) throw new AppError('Ya existe una carta con este número.', 409, 'LETTER_ARCHIVE_DOCUMENT_CODE_EXISTS');
      }
      const versionNumber = existing.versionNumber + 1;
      const data = { documentCode: input.code, documentType: input.type, recordType: input.recordType, documentDate: input.date, entity: input.entity, location: input.location, subject: input.subject, status: input.status, content: input.content, versionNumber };
      const updated = await tx.letterArchiveRoot.update({ where: { id: rootId }, data });
      await tx.letterArchiveVersion.create({ data: { rootId, ...data } });
      await ensureDocumentFolders(tx as unknown as Prisma.TransactionClient, rootId, input.code);
      return updated;
    });
    return toRecord(root);
  }

  static async restoreRecordVersion(companyId: number, rootId: string, versionNumber: number) {
    const version = await prisma.letterArchiveVersion.findFirst({ where: { rootId, versionNumber, root: { companyId } } });
    if (!version) throw new AppError('Versión no encontrada.', 404, 'LETTER_ARCHIVE_VERSION_NOT_FOUND');
    return this.saveRecord(companyId, rootId, { code: version.documentCode, type: version.documentType, recordType: version.recordType, date: version.documentDate ?? new Date(), entity: version.entity, location: version.location, subject: version.subject, status: version.status, content: version.content });
  }

  static async createFolder(rootId: string, name: string, parentId?: string | null) {
    if (parentId) {
      const parent = await prisma.letterArchiveFolder.findFirst({ where: { id: parentId, rootId }, select: { id: true } });
      if (!parent) throw new AppError('El título padre no pertenece a este registro.', 400, 'LETTER_ARCHIVE_PARENT_INVALID');
    }
    const lastFolder = await prisma.letterArchiveFolder.findFirst({ where: { rootId, parentId: parentId ?? null }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return prisma.letterArchiveFolder.create({ data: { rootId, name, parentId: parentId ?? null, sortOrder: (lastFolder?.sortOrder ?? -1) + 1 } });
  }

  static async renameFolder(folderId: string, name: string) {
    const folder = await prisma.letterArchiveFolder.findUnique({ where: { id: folderId }, select: { id: true } });
    if (!folder) throw new AppError('Carpeta no encontrada.', 404, 'LETTER_ARCHIVE_FOLDER_NOT_FOUND');
    return prisma.letterArchiveFolder.update({ where: { id: folderId }, data: { name } });
  }

  static async duplicateFolder(folderId: string) {
    const folder = await prisma.letterArchiveFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new AppError('Carpeta no encontrada.', 404, 'LETTER_ARCHIVE_FOLDER_NOT_FOUND');
    const siblings = await prisma.letterArchiveFolder.findMany({ where: { rootId: folder.rootId, parentId: folder.parentId }, select: { name: true } });
    const names = new Set(siblings.map(item => item.name));
    let index = 1;
    let name = `${folder.name} (copia)`;
    while (names.has(name)) name = `${folder.name} (copia ${index++})`;
    const lastFolder = await prisma.letterArchiveFolder.findFirst({ where: { rootId: folder.rootId, parentId: folder.parentId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return prisma.letterArchiveFolder.create({ data: { rootId: folder.rootId, parentId: folder.parentId, name, sortOrder: (lastFolder?.sortOrder ?? -1) + 1 } });
  }

  static async moveFolder(folderId: string, direction: 'up' | 'down') {
    const folder = await prisma.letterArchiveFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new AppError('Carpeta no encontrada.', 404, 'LETTER_ARCHIVE_FOLDER_NOT_FOUND');
    const siblings = await prisma.letterArchiveFolder.findMany({ where: { rootId: folder.rootId, parentId: folder.parentId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    const index = siblings.findIndex(item => item.id === folderId);
    const target = siblings[direction === 'up' ? index - 1 : index + 1];
    if (!target) return folder;
    await prisma.$transaction([
      prisma.letterArchiveFolder.update({ where: { id: folder.id }, data: { sortOrder: target.sortOrder } }),
      prisma.letterArchiveFolder.update({ where: { id: target.id }, data: { sortOrder: folder.sortOrder } }),
    ]);
    return prisma.letterArchiveFolder.findUniqueOrThrow({ where: { id: folderId } });
  }

  static async deleteFolder(folderId: string) {
    const folder = await prisma.letterArchiveFolder.findUnique({ where: { id: folderId }, include: { _count: { select: { children: true, documents: true } } } });
    if (!folder) throw new AppError('Carpeta no encontrada.', 404, 'LETTER_ARCHIVE_FOLDER_NOT_FOUND');
    if (folder._count.children || folder._count.documents) throw new AppError('Primero elimina o mueve los elementos contenidos en esta carpeta.', 409, 'LETTER_ARCHIVE_FOLDER_NOT_EMPTY');
    await prisma.letterArchiveFolder.delete({ where: { id: folderId } });
  }

  static async createDocuments(folderId: string, files: Upload[]) {
    const folder = await prisma.letterArchiveFolder.findUnique({ where: { id: folderId }, select: { id: true, rootId: true } });
    if (!folder) throw new AppError('Subtítulo no encontrado.', 404, 'LETTER_ARCHIVE_FOLDER_NOT_FOUND');
    const created: unknown[] = [];
    try {
      for (const file of files) {
        const documentId = randomUUID();
        const stored = await persistLetterArchiveFile({ stagedPath: file.path, rootId: folder.rootId, documentId, originalName: file.originalname });
        created.push(await prisma.letterArchiveDocument.create({ data: { id: documentId, rootId: folder.rootId, folderId, displayName: file.originalname, storageKey: stored.storageKey, originalName: file.originalname, mimeType: file.mimetype || 'application/octet-stream', sizeBytes: BigInt(file.size) } }));
      }
      return created;
    } catch (error) {
      await Promise.all(files.map(file => removeLetterArchiveStagedFile(file.path)));
      throw error;
    }
  }

  static async download(documentId: string) {
    const document = await prisma.letterArchiveDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new AppError('Archivo no encontrado.', 404, 'LETTER_ARCHIVE_DOCUMENT_NOT_FOUND');
    return { ...document, absolutePath: resolveLetterArchiveFile(document.storageKey) };
  }
}
export default LetterArchiveService;
