import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const CORPORATE_ARCHIVE_CATEGORIES = [
  'IDENTITY',
  'MANAGEMENT',
  'ADMINISTRATION',
  'PEOPLE',
  'COMMERCIAL',
  'COMPLIANCE',
  'EXPERIENCE',
  'CONTRACTS',
] as const;

export type CorporateArchiveCategory =
  (typeof CORPORATE_ARCHIVE_CATEGORIES)[number];
export type CorporateArchiveScopeType = 'COMPANY' | 'CONSORTIUM';
export type CorporateArchiveFileStatus =
  | 'READY'
  | 'SKIPPED_TEMPORARY';

export type CorporateArchiveImportInput = {
  source: string;
  scopeType: CorporateArchiveScopeType;
  scopeId: number;
  actorId: number;
  includeTemporary?: boolean;
};

export type CorporateArchiveFolderManifestEntry = {
  kind: 'FOLDER';
  sourceDirectory: string;
  parentSourceDirectory: string | null;
  name: string;
  targetFolderRef: string;
  parentTargetFolderRef: string;
  category: CorporateArchiveCategory;
};

export type CorporateArchiveFileManifestEntry = {
  kind: 'FILE';
  sourceFile: string;
  targetFolderRef: string;
  targetFileRef: string;
  storageKey: string;
  originalName: string;
  extension: string;
  mimeType: string;
  sizeBytes: string;
  sha256: string;
  status: CorporateArchiveFileStatus;
  category: CorporateArchiveCategory;
};

export type CorporateArchiveCategoryRootManifestEntry = {
  rootRef: string;
  rootFolderRef: string;
};

export type CorporateArchiveImportManifest = {
  version: 1;
  scope: {
    type: CorporateArchiveScopeType;
    id: number;
  };
  actorId: number;
  sourceRoot: string;
  categoryRoots: Record<
    CorporateArchiveCategory,
    CorporateArchiveCategoryRootManifestEntry
  >;
  includeTemporary: boolean;
  folders: CorporateArchiveFolderManifestEntry[];
  files: CorporateArchiveFileManifestEntry[];
  summary: {
    directories: number;
    files: number;
    readyFiles: number;
    skippedTemporaryFiles: number;
    bytes: string;
  };
};

export type CorporateArchiveImportPlan = {
  manifest: CorporateArchiveImportManifest;
  manifestSha256: string;
};

export class CorporateArchiveImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorporateArchiveImportError';
  }
}

const UUID_NAMESPACE = 'aa449a6c-1903-5572-a4dc-4811290b3c3c';

export const corporateArchiveExtendedSourcePath = (candidate: string) => {
  if (process.platform !== 'win32' || candidate.startsWith('\\\\?\\')) {
    return candidate;
  }
  if (candidate.startsWith('\\\\')) {
    return `\\\\?\\UNC\\${candidate.slice(2)}`;
  }
  return `\\\\?\\${candidate}`;
};

const normalizedRelativePath = (candidate: string) =>
  candidate.split(path.sep).join('/').replace(/^\.\/?/, '');

const normalizedComparablePath = (candidate: string) =>
  candidate
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('\\', '/')
    .replace(/\/+/, '/')
    .toLocaleUpperCase('es-PE');

const uuidBytes = (value: string) => {
  const bytes = Buffer.from(value.replaceAll('-', ''), 'hex');
  if (bytes.length !== 16) {
    throw new CorporateArchiveImportError('Namespace UUID invalido.');
  }
  return bytes;
};

/** A deterministic RFC 4122 UUID v5 for manifest references. */
export const corporateArchiveDeterministicId = (name: string) => {
  const bytes = createHash('sha1')
    .update(Buffer.concat([uuidBytes(UUID_NAMESPACE), Buffer.from(name, 'utf8')]))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const folderReference = (
  scopeType: CorporateArchiveScopeType,
  scopeId: number,
  category: CorporateArchiveCategory,
  relativePath: string
) =>
  corporateArchiveDeterministicId(
    `corporate-archive:${scopeType}:${scopeId}:${category}:folder:${relativePath}`
  );

const fileReference = (
  scopeType: CorporateArchiveScopeType,
  scopeId: number,
  category: CorporateArchiveCategory,
  relativePath: string
) =>
  corporateArchiveDeterministicId(
    `corporate-archive:${scopeType}:${scopeId}:${category}:file:${relativePath}`
  );

const categoryRootReferences = (
  scopeType: CorporateArchiveScopeType,
  scopeId: number
): CorporateArchiveImportManifest['categoryRoots'] =>
  Object.fromEntries(
    CORPORATE_ARCHIVE_CATEGORIES.map(category => [
      category,
      {
        rootRef: corporateArchiveDeterministicId(
          `corporate-archive:${scopeType}:${scopeId}:${category}:root`
        ),
        rootFolderRef: corporateArchiveDeterministicId(
          `corporate-archive:${scopeType}:${scopeId}:${category}:root-folder`
        ),
      },
    ])
  ) as CorporateArchiveImportManifest['categoryRoots'];

export const isCorporateArchiveTemporaryFile = (filename: string) =>
  filename.startsWith('~$') || /^~WRL.*\.tmp$/i.test(filename);

export const corporateArchiveCategoryForPath = (
  sourceRelativePath: string
): CorporateArchiveCategory => {
  const comparable = normalizedComparablePath(sourceRelativePath);
  if (comparable.includes('/7 IMAGEN INSTITUCIONAL')) return 'IDENTITY';
  if (comparable.includes('/2 ACTAS DE COORDINACION')) return 'MANAGEMENT';
  if (
    comparable.includes('/1 DOCUMENTOS DE TRAMITE INTERNO') ||
    comparable.includes('/3 DOCUMENTOS DE PRESUPUESTO Y PROGRAMACION') ||
    comparable.includes('/5 DOCUMENTOS DE INVENTARIO EQUIPOS Y BIENES')
  ) {
    return 'ADMINISTRATION';
  }
  if (comparable.includes('/4 DOCUMENTOS DE REGISTRO PERSONAL')) {
    return 'PEOPLE';
  }
  if (comparable.includes('/6 COTIZACIONES Y-O PROPUESTAS ECONOMICAS')) {
    return 'COMMERCIAL';
  }
  if (
    comparable.includes('/8 OSCE') ||
    comparable.includes('/9 SUNAT') ||
    comparable.includes('/10 DOCUMENTOS DE CERTIFICACION') ||
    comparable.includes('/11 CASOS DE FISCALIA')
  ) {
    return 'COMPLIANCE';
  }
  if (
    comparable.includes('/12 DOCUMENTOS DE EXPERIENCIA DE PROFESIONALES') ||
    comparable.includes('/13 DOCUMENTOS DE EXPERIENCIA DE EMPRESA') ||
    comparable.includes('EXPERIENCIA') ||
    comparable.includes('COORPORACION DHYRIUM EM')
  ) {
    return 'EXPERIENCE';
  }
  if (comparable.includes('/14 CONTRATOS') || comparable.includes('CONTRATO')) {
    return 'CONTRACTS';
  }
  return 'IDENTITY';
};

export const detectCorporateArchiveMimeType = (
  filename: string,
  sample: Uint8Array
) => {
  const header = Buffer.from(sample);
  if (header.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  const extension = path.extname(filename).toLocaleLowerCase('en-US');
  if (extension === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (extension === '.xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (extension === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
};

const fileDigestAndMime = async (filePath: string, filename: string) => {
  const digest = createHash('sha256');
  const stream = createReadStream(filePath);
  let sample = Buffer.alloc(0);
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    digest.update(buffer);
    if (sample.length < 512) sample = Buffer.concat([sample, buffer]).subarray(0, 512);
  }
  return {
    sha256: digest.digest('hex'),
    mimeType: detectCorporateArchiveMimeType(filename, sample),
  };
};

const isWindowsReparsePoint = (metadata: Awaited<ReturnType<typeof lstat>>) => {
  if (metadata.isSymbolicLink()) return true;
  /*
   * Node reports junctions as symlinks on supported Windows releases. Some
   * builds additionally expose the native FILE_ATTRIBUTE_REPARSE_POINT bit.
   * Check both representations so a future Node implementation cannot make a
   * junction silently traversable.
   */
  const fileAttributes = (metadata as unknown as { fileAttributes?: unknown })
    .fileAttributes;
  return (
    process.platform === 'win32' &&
    typeof fileAttributes === 'number' &&
    (fileAttributes & 0x400) === 0x400
  );
};

const assertSafeDirectory = async (candidate: string, label: string) => {
  const metadata = await lstat(corporateArchiveExtendedSourcePath(candidate));
  if (isWindowsReparsePoint(metadata)) {
    throw new CorporateArchiveImportError(
      `${label} no puede ser un enlace simbolico o reparse point.`
    );
  }
  if (!metadata.isDirectory()) {
    throw new CorporateArchiveImportError(`${label} debe ser una carpeta.`);
  }
};

const stableStringify = (manifest: CorporateArchiveImportManifest) =>
  JSON.stringify(manifest);

export const corporateArchiveManifestSha256 = (
  manifest: CorporateArchiveImportManifest
) => createHash('sha256').update(stableStringify(manifest), 'utf8').digest('hex');

export const buildCorporateArchiveImportPlan = async (
  input: CorporateArchiveImportInput
): Promise<CorporateArchiveImportPlan> => {
  if (!Number.isSafeInteger(input.scopeId) || input.scopeId <= 0) {
    throw new CorporateArchiveImportError('scopeId debe ser un entero positivo.');
  }
  if (!Number.isSafeInteger(input.actorId) || input.actorId <= 0) {
    throw new CorporateArchiveImportError('actorId debe ser un entero positivo.');
  }
  const sourceRoot = path.resolve(input.source);
  await assertSafeDirectory(sourceRoot, 'La carpeta fuente');

  const categoryRoots = categoryRootReferences(input.scopeType, input.scopeId);
  const folders: CorporateArchiveFolderManifestEntry[] = [];
  const files: CorporateArchiveFileManifestEntry[] = [];
  const folderBySourceDirectory = new Map<
    string,
    Pick<CorporateArchiveFolderManifestEntry, 'category' | 'targetFolderRef'>
  >();
  const pendingDirectories: Array<{ absolutePath: string; relativePath: string }> = [
    { absolutePath: sourceRoot, relativePath: '' },
  ];

  while (pendingDirectories.length) {
    const current = pendingDirectories.pop();
    if (!current) break;
    const entries = await readdir(corporateArchiveExtendedSourcePath(current.absolutePath), {
      withFileTypes: true,
    });
    entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    );

    const childDirectories: Array<{ absolutePath: string; relativePath: string }> = [];
    for (const entry of entries) {
      const absolutePath = path.join(current.absolutePath, entry.name);
      const relativePath = normalizedRelativePath(
        current.relativePath ? path.join(current.relativePath, entry.name) : entry.name
      );
      const metadata = await lstat(corporateArchiveExtendedSourcePath(absolutePath));
      if (entry.isSymbolicLink() || isWindowsReparsePoint(metadata)) {
        throw new CorporateArchiveImportError(
          `Reparse point rechazado: ${relativePath}`
        );
      }
      if (metadata.isDirectory()) {
        const category = corporateArchiveCategoryForPath(relativePath);
        const parent = current.relativePath
          ? folderBySourceDirectory.get(current.relativePath)
          : undefined;
        const targetFolderRef = folderReference(
          input.scopeType,
          input.scopeId,
          category,
          relativePath
        );
        const folder: CorporateArchiveFolderManifestEntry = {
          kind: 'FOLDER',
          sourceDirectory: relativePath,
          parentSourceDirectory: current.relativePath || null,
          name: entry.name,
          targetFolderRef,
          parentTargetFolderRef:
            parent && parent.category === category
              ? parent.targetFolderRef
              : categoryRoots[category].rootFolderRef,
          category,
        };
        folders.push(folder);
        folderBySourceDirectory.set(relativePath, folder);
        childDirectories.push({ absolutePath, relativePath });
        continue;
      }
      if (!metadata.isFile()) {
        throw new CorporateArchiveImportError(
          `Entrada fuente no admitida: ${relativePath}`
        );
      }
      const sourceFileStats = await stat(corporateArchiveExtendedSourcePath(absolutePath));
      const { sha256, mimeType } = await fileDigestAndMime(
        corporateArchiveExtendedSourcePath(absolutePath),
        entry.name
      );
      const category = corporateArchiveCategoryForPath(relativePath);
      const currentFolder = current.relativePath
        ? folderBySourceDirectory.get(current.relativePath)
        : undefined;
      const targetFileRef = fileReference(
        input.scopeType,
        input.scopeId,
        category,
        relativePath
      );
      const extension = path.extname(entry.name).toLocaleLowerCase('en-US');
      const temporary = isCorporateArchiveTemporaryFile(entry.name);
      files.push({
        kind: 'FILE',
        sourceFile: relativePath,
        targetFolderRef:
          currentFolder && currentFolder.category === category
            ? currentFolder.targetFolderRef
            : categoryRoots[category].rootFolderRef,
        targetFileRef,
        storageKey: `${input.scopeType.toLocaleLowerCase('en-US')}/${input.scopeId}/${targetFileRef}${extension}`,
        originalName: entry.name,
        extension,
        mimeType,
        sizeBytes: sourceFileStats.size.toString(),
        sha256,
        status:
          temporary && !input.includeTemporary ? 'SKIPPED_TEMPORARY' : 'READY',
        category,
      });
    }
    for (let index = childDirectories.length - 1; index >= 0; index -= 1) {
      pendingDirectories.push(childDirectories[index]);
    }
  }

  folders.sort((left, right) =>
    left.sourceDirectory < right.sourceDirectory
      ? -1
      : left.sourceDirectory > right.sourceDirectory
        ? 1
        : 0
  );
  files.sort((left, right) =>
    left.sourceFile < right.sourceFile ? -1 : left.sourceFile > right.sourceFile ? 1 : 0
  );
  const readyFiles = files.filter(file => file.status === 'READY');
  const manifest: CorporateArchiveImportManifest = {
    version: 1,
    scope: { type: input.scopeType, id: input.scopeId },
    actorId: input.actorId,
    sourceRoot,
    categoryRoots,
    includeTemporary: Boolean(input.includeTemporary),
    folders,
    files,
    summary: {
      directories: folders.length,
      files: files.length,
      readyFiles: readyFiles.length,
      skippedTemporaryFiles: files.length - readyFiles.length,
      bytes: files
        .reduce((total, file) => total + BigInt(file.sizeBytes), 0n)
        .toString(),
    },
  };
  return { manifest, manifestSha256: corporateArchiveManifestSha256(manifest) };
};

export type CorporateArchiveReconciliation = {
  missingFolders: string[];
  missingFiles: string[];
  changedFiles: string[];
  unexpectedFolders: string[];
  unexpectedFiles: string[];
};

/** Pure reconciliation: callers obtain existing source keys from persistence. */
export const reconcileCorporateArchiveManifest = (
  manifest: CorporateArchiveImportManifest,
  existing: {
    folders: Iterable<string>;
    files: Iterable<{ sourceFile: string; sha256: string }>;
  }
): CorporateArchiveReconciliation => {
  const existingFolders = new Set(existing.folders);
  const existingFiles = new Map(
    Array.from(existing.files, file => [file.sourceFile, file.sha256])
  );
  const expectedFolders = new Set(manifest.folders.map(folder => folder.sourceDirectory));
  const expectedFiles = new Set(manifest.files.map(file => file.sourceFile));
  return {
    missingFolders: manifest.folders
      .filter(folder => !existingFolders.has(folder.sourceDirectory))
      .map(folder => folder.sourceDirectory),
    missingFiles: manifest.files
      .filter(file => !existingFiles.has(file.sourceFile))
      .map(file => file.sourceFile),
    changedFiles: manifest.files
      .filter(file => {
        const currentHash = existingFiles.get(file.sourceFile);
        return Boolean(currentHash && currentHash !== file.sha256);
      })
      .map(file => file.sourceFile),
    unexpectedFolders: Array.from(existingFolders)
      .filter(sourceDirectory => !expectedFolders.has(sourceDirectory))
      .sort(),
    unexpectedFiles: Array.from(existingFiles.keys())
      .filter(sourceFile => !expectedFiles.has(sourceFile))
      .sort(),
  };
};

export const serializeCorporateArchiveImportPlan = (
  plan: CorporateArchiveImportPlan
) => `${JSON.stringify(plan, null, 2)}\n`;

export const readCorporateArchiveMimeSample = async (filePath: string) => {
  const handle = await open(corporateArchiveExtendedSourcePath(filePath), 'r');
  try {
    const sample = Buffer.alloc(512);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    return sample.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};
