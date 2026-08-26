import { createHash } from 'node:crypto';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { inflateRawSync } from 'node:zlib';

export type DocxCompatibility = 'compatible' | 'preserved' | 'blocked';

export type OoxmlConformance = 'strict' | 'transitional' | 'mixed' | 'unknown';

export interface DocxInspectionLimits {
  maxInputBytes: number;
  maxEntries: number;
  maxExpandedBytes: number;
  maxEntryExpandedBytes: number;
  maxCompressionRatio: number;
  maxPathLength: number;
  maxPathDepth: number;
  maxXmlBytes: number;
  maxXmlDepth: number;
  maxXmlTags: number;
  maxRelationships: number;
}

export interface DocxInspectionIssue {
  code: string;
  severity: 'warning' | 'error';
  disposition: Exclude<DocxCompatibility, 'compatible'>;
  message: string;
  part?: string;
}

export interface OpcPartInspection {
  name: string;
  compressedBytes: number;
  expandedBytes: number;
  compressionRatio: number;
  crc32: string;
  contentType?: string;
  disposition: DocxCompatibility;
}

export interface OpcRelationshipInspection {
  source: string;
  id: string;
  type: string;
  target: string;
  targetMode: 'Internal' | 'External';
  resolvedTarget?: string;
  disposition: DocxCompatibility;
}

export interface DocxInspectionReport {
  verdict: DocxCompatibility;
  /** Compatibility gate only. It never grants task/document authorization. */
  editingGate: 'eligible' | 'requires-opaque-preservation-engine' | 'blocked';
  requiresOpaquePreservation: boolean;
  sha256: string;
  byteLength: number;
  ooxmlConformance: OoxmlConformance;
  package: {
    entryCount: number;
    compressedBytes: number;
    expandedBytes: number;
    compressionRatio: number;
  };
  flags: {
    encrypted: boolean;
    macros: boolean;
    activeX: boolean;
    oleObjects: boolean;
    externalRelationships: boolean;
  };
  parts: OpcPartInspection[];
  relationships: OpcRelationshipInspection[];
  issues: DocxInspectionIssue[];
}

export interface DocxNoOpRoundTrip {
  /** The exact input reference; the no-op path never rebuilds the ZIP. */
  buffer: Buffer;
  sha256: string;
  byteLength: number;
  byteIdentical: true;
  inspection: DocxInspectionReport;
}

export const DEFAULT_DOCX_INSPECTION_LIMITS: Readonly<DocxInspectionLimits> =
  Object.freeze({
    maxInputBytes: 64 * 1024 * 1024,
    maxEntries: 4096,
    maxExpandedBytes: 256 * 1024 * 1024,
    maxEntryExpandedBytes: 64 * 1024 * 1024,
    maxCompressionRatio: 200,
    maxPathLength: 512,
    maxPathDepth: 32,
    maxXmlBytes: 32 * 1024 * 1024,
    maxXmlDepth: 256,
    maxXmlTags: 500_000,
    maxRelationships: 20_000,
  });

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_DATA_DESCRIPTOR = 0x08074b50;
const ZIP64_EXTRA_FIELD = 0x0001;
const MAX_ZIP_COMMENT_BYTES = 0xffff;
const MAX_REPORTED_ISSUES = 256;
const COMPOUND_FILE_BINARY_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

const REQUIRED_PARTS = new Set([
  '[Content_Types].xml',
  '_rels/.rels',
  'word/document.xml',
]);

const TRANSITIONAL_WORD_NAMESPACE =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const STRICT_WORD_NAMESPACE =
  'http://purl.oclc.org/ooxml/wordprocessingml/main';
const TRANSITIONAL_OFFICE_DOCUMENT_RELATIONSHIP =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';
const STRICT_OFFICE_DOCUMENT_RELATIONSHIP =
  'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument';
const OPC_CONTENT_TYPES_NAMESPACE =
  'http://schemas.openxmlformats.org/package/2006/content-types';
const OPC_RELATIONSHIPS_NAMESPACE =
  'http://schemas.openxmlformats.org/package/2006/relationships';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

interface CentralDirectoryEntry {
  name: string;
  nameBytes: Buffer;
  flags: number;
  compressionMethod: number;
  crc32: number;
  compressedBytes: number;
  expandedBytes: number;
  localHeaderOffset: number;
  dataOffset: number;
  physicalEnd: number;
  isDirectory: boolean;
}

interface ParsedArchive {
  entries: CentralDirectoryEntry[];
  centralDirectoryOffset: number;
  compressedBytes: number;
  expandedBytes: number;
}

interface XmlTag {
  name: string;
  attributes: Readonly<Record<string, string>>;
  namespaceUri?: string;
}

interface XmlScanResult {
  root: XmlTag;
  selected: XmlTag[];
}

class InspectionFailure extends Error {
  constructor(
    readonly issue: DocxInspectionIssue,
    options?: { cause?: unknown }
  ) {
    super(issue.message, options);
    this.name = 'InspectionFailure';
  }
}

function blockedFailure(
  code: string,
  message: string,
  part?: string,
  cause?: unknown
): never {
  throw new InspectionFailure(
    {
      code,
      severity: 'error',
      disposition: 'blocked',
      message,
      ...(part ? { part } : {}),
    },
    cause === undefined ? undefined : { cause }
  );
}

const ratio = (expandedBytes: number, compressedBytes: number) => {
  if (expandedBytes === 0) return 0;
  if (compressedBytes === 0) return Number.POSITIVE_INFINITY;
  return expandedBytes / compressedBytes;
};

const sha256 = (buffer: Buffer) =>
  createHash('sha256').update(buffer).digest('hex');

const normalizeLimits = (
  overrides: Partial<DocxInspectionLimits>
): DocxInspectionLimits => {
  const limits = { ...DEFAULT_DOCX_INSPECTION_LIMITS, ...overrides };

  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new TypeError(`El limite ${name} debe ser un numero positivo.`);
    }
  }

  return limits;
};

const assertBufferRange = (
  buffer: Buffer,
  offset: number,
  length: number,
  code: string,
  message: string
) => {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > buffer.length - length
  ) {
    blockedFailure(code, message);
  }
};

const findEndOfCentralDirectory = (buffer: Buffer): number => {
  if (buffer.length < 22) {
    blockedFailure('ZIP_TOO_SHORT', 'El archivo no contiene un ZIP completo.');
  }

  const firstCandidate = Math.max(
    0,
    buffer.length - (22 + MAX_ZIP_COMMENT_BYTES)
  );

  const candidates: number[] = [];
  for (let offset = buffer.length - 22; offset >= firstCandidate; offset -= 1) {
    if (buffer.readUInt32LE(offset) !== ZIP_END_OF_CENTRAL_DIRECTORY) {
      continue;
    }

    const commentLength = buffer.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === buffer.length) {
      candidates.push(offset);
    }
  }

  if (candidates.length > 1) {
    blockedFailure(
      'ZIP_AMBIGUOUS_EOCD',
      'El archivo contiene mas de un fin de directorio central plausible.'
    );
  }
  if (candidates.length === 1) return candidates[0];

  blockedFailure(
    'ZIP_EOCD_NOT_FOUND',
    'No se encontro un directorio central ZIP valido.'
  );
};

const decodeEntryName = (bytes: Buffer, flags: number): string => {
  if (bytes.length === 0) {
    blockedFailure('ZIP_EMPTY_PATH', 'Una entrada ZIP no tiene nombre.');
  }

  if (bytes.includes(0)) {
    blockedFailure('ZIP_PATH_NUL', 'Una ruta ZIP contiene un byte NUL.');
  }

  try {
    if ((flags & 0x0800) !== 0) {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }

    if (bytes.some(byte => byte > 0x7f)) {
      blockedFailure(
        'ZIP_LEGACY_PATH_ENCODING',
        'Una ruta ZIP usa una codificacion heredada ambigua.'
      );
    }

    return bytes.toString('ascii');
  } catch (error) {
    if (error instanceof InspectionFailure) throw error;
    blockedFailure(
      'ZIP_PATH_ENCODING_INVALID',
      'Una ruta ZIP no es UTF-8 valida.',
      undefined,
      error
    );
  }
};

const validatePercentEncodedSegment = (segment: string, fullName: string) => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch (error) {
    blockedFailure(
      'ZIP_PATH_PERCENT_ENCODING',
      `La ruta ZIP ${fullName} contiene escapes invalidos.`,
      fullName,
      error
    );
  }

  if (
    decoded === '.' ||
    decoded === '..' ||
    decoded.includes('/') ||
    decoded.includes('\\') ||
    decoded.includes('\0')
  ) {
    blockedFailure(
      'ZIP_PATH_TRAVERSAL',
      `La ruta ZIP ${fullName} es insegura.`,
      fullName
    );
  }
};

const validateEntryPath = (name: string, limits: DocxInspectionLimits) => {
  if (name.length > limits.maxPathLength) {
    blockedFailure(
      'ZIP_PATH_TOO_LONG',
      `La ruta ZIP excede ${limits.maxPathLength} caracteres.`,
      name
    );
  }

  if (
    name.startsWith('/') ||
    name.startsWith('\\') ||
    /^[a-zA-Z]:/.test(name) ||
    name.includes('\\') ||
    name.includes(':')
  ) {
    blockedFailure(
      'ZIP_ABSOLUTE_PATH',
      `La ruta ZIP ${name} no es relativa y segura.`,
      name
    );
  }

  const isDirectory = name.endsWith('/');
  const segments = name.split('/');
  if (isDirectory) segments.pop();

  if (segments.length > limits.maxPathDepth) {
    blockedFailure(
      'ZIP_PATH_DEPTH_LIMIT',
      `La ruta ZIP ${name} excede la profundidad permitida.`,
      name
    );
  }

  if (
    segments.length === 0 ||
    segments.some(
      segment => segment === '' || segment === '.' || segment === '..'
    )
  ) {
    blockedFailure(
      'ZIP_PATH_TRAVERSAL',
      `La ruta ZIP ${name} contiene segmentos inseguros.`,
      name
    );
  }

  for (const segment of segments) {
    validatePercentEncodedSegment(segment, name);
  }
};

const rejectZip64ExtraField = (extra: Buffer, part?: string) => {
  let offset = 0;
  while (offset < extra.length) {
    if (extra.length - offset < 4) {
      blockedFailure(
        'ZIP_EXTRA_FIELD_TRUNCATED',
        'Una entrada ZIP contiene metadata extra truncada.',
        part
      );
    }
    const fieldId = extra.readUInt16LE(offset);
    const fieldLength = extra.readUInt16LE(offset + 2);
    offset += 4;
    if (fieldLength > extra.length - offset) {
      blockedFailure(
        'ZIP_EXTRA_FIELD_TRUNCATED',
        'Una entrada ZIP contiene metadata extra truncada.',
        part
      );
    }
    if (fieldId === ZIP64_EXTRA_FIELD) {
      blockedFailure(
        'ZIP64_UNSUPPORTED',
        'ZIP64 no pertenece al perfil DOCX seguro de esta fase.',
        part
      );
    }
    offset += fieldLength;
  }
};

const validateGeneralPurposeFlags = (flags: number, part?: string) => {
  if ((flags & 0x0001) !== 0 || (flags & 0x0040) !== 0) {
    blockedFailure(
      'ZIP_ENCRYPTED_ENTRY',
      'El paquete contiene una entrada cifrada.',
      part
    );
  }

  const allowedFlags = 0x0002 | 0x0004 | 0x0008 | 0x0800;
  if ((flags & ~allowedFlags) !== 0) {
    blockedFailure(
      'ZIP_UNSUPPORTED_FLAGS',
      'El paquete usa opciones ZIP no admitidas por el perfil seguro.',
      part
    );
  }
};

const validateLocalHeaders = (
  buffer: Buffer,
  entries: CentralDirectoryEntry[],
  centralDirectoryOffset: number
) => {
  for (const entry of entries) {
    assertBufferRange(
      buffer,
      entry.localHeaderOffset,
      30,
      'ZIP_LOCAL_HEADER_TRUNCATED',
      `La cabecera local de ${entry.name} esta truncada.`
    );

    if (
      buffer.readUInt32LE(entry.localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER
    ) {
      blockedFailure(
        'ZIP_LOCAL_HEADER_INVALID',
        `La cabecera local de ${entry.name} no es valida.`,
        entry.name
      );
    }

    const localFlags = buffer.readUInt16LE(entry.localHeaderOffset + 6);
    const localMethod = buffer.readUInt16LE(entry.localHeaderOffset + 8);
    const localCrc = buffer.readUInt32LE(entry.localHeaderOffset + 14);
    const localCompressed = buffer.readUInt32LE(entry.localHeaderOffset + 18);
    const localExpanded = buffer.readUInt32LE(entry.localHeaderOffset + 22);
    const localNameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
    const localVariableLength = localNameLength + localExtraLength;

    assertBufferRange(
      buffer,
      entry.localHeaderOffset + 30,
      localVariableLength,
      'ZIP_LOCAL_HEADER_TRUNCATED',
      `La cabecera local de ${entry.name} esta truncada.`
    );

    const localName = buffer.subarray(
      entry.localHeaderOffset + 30,
      entry.localHeaderOffset + 30 + localNameLength
    );
    if (!localName.equals(entry.nameBytes)) {
      blockedFailure(
        'ZIP_LOCAL_NAME_MISMATCH',
        `La ruta local y central de ${entry.name} no coinciden.`,
        entry.name
      );
    }

    if (localFlags !== entry.flags || localMethod !== entry.compressionMethod) {
      blockedFailure(
        'ZIP_LOCAL_METADATA_MISMATCH',
        `La metadata local y central de ${entry.name} no coincide.`,
        entry.name
      );
    }

    const localExtra = buffer.subarray(
      entry.localHeaderOffset + 30 + localNameLength,
      entry.localHeaderOffset + 30 + localVariableLength
    );
    rejectZip64ExtraField(localExtra, entry.name);

    const usesDescriptor = (entry.flags & 0x0008) !== 0;
    if (
      !usesDescriptor &&
      (localCrc !== entry.crc32 ||
        localCompressed !== entry.compressedBytes ||
        localExpanded !== entry.expandedBytes)
    ) {
      blockedFailure(
        'ZIP_LOCAL_SIZE_MISMATCH',
        `Los tamanos locales y centrales de ${entry.name} no coinciden.`,
        entry.name
      );
    }

    entry.dataOffset = entry.localHeaderOffset + 30 + localVariableLength;
    const dataEnd = entry.dataOffset + entry.compressedBytes;
    if (!Number.isSafeInteger(dataEnd) || dataEnd > centralDirectoryOffset) {
      blockedFailure(
        'ZIP_ENTRY_DATA_OUT_OF_RANGE',
        `Los datos de ${entry.name} salen del area ZIP permitida.`,
        entry.name
      );
    }

    entry.physicalEnd = dataEnd;
    if (usesDescriptor) {
      let descriptorOffset = dataEnd;
      assertBufferRange(
        buffer,
        descriptorOffset,
        12,
        'ZIP_DATA_DESCRIPTOR_TRUNCATED',
        `El descriptor de ${entry.name} esta truncado.`
      );
      if (buffer.readUInt32LE(descriptorOffset) === ZIP_DATA_DESCRIPTOR) {
        descriptorOffset += 4;
        assertBufferRange(
          buffer,
          descriptorOffset,
          12,
          'ZIP_DATA_DESCRIPTOR_TRUNCATED',
          `El descriptor de ${entry.name} esta truncado.`
        );
      }

      if (
        buffer.readUInt32LE(descriptorOffset) !== entry.crc32 ||
        buffer.readUInt32LE(descriptorOffset + 4) !== entry.compressedBytes ||
        buffer.readUInt32LE(descriptorOffset + 8) !== entry.expandedBytes
      ) {
        blockedFailure(
          'ZIP_DATA_DESCRIPTOR_MISMATCH',
          `El descriptor de ${entry.name} no coincide con el directorio central.`,
          entry.name
        );
      }
      entry.physicalEnd = descriptorOffset + 12;
    }

    if (entry.physicalEnd > centralDirectoryOffset) {
      blockedFailure(
        'ZIP_ENTRY_DATA_OUT_OF_RANGE',
        `La entrada ${entry.name} invade el directorio central.`,
        entry.name
      );
    }
  }

  const ranges = [...entries].sort(
    (left, right) => left.localHeaderOffset - right.localHeaderOffset
  );
  let previousEnd = 0;
  for (const entry of ranges) {
    if (entry.localHeaderOffset < previousEnd) {
      blockedFailure(
        'ZIP_ENTRY_OVERLAP',
        `La entrada ${entry.name} se superpone con otra entrada ZIP.`,
        entry.name
      );
    }
    if (entry.localHeaderOffset > previousEnd) {
      blockedFailure(
        'ZIP_UNINDEXED_DATA_GAP',
        `Existen bytes o entradas no indexadas antes de ${entry.name}.`,
        entry.name
      );
    }
    previousEnd = entry.physicalEnd;
  }
  if (previousEnd !== centralDirectoryOffset) {
    blockedFailure(
      'ZIP_UNINDEXED_DATA_GAP',
      'Existen bytes o entradas no indexadas antes del directorio central.'
    );
  }
};

const parseCentralDirectory = (
  buffer: Buffer,
  limits: DocxInspectionLimits
): ParsedArchive => {
  if (buffer.length > limits.maxInputBytes) {
    blockedFailure(
      'ZIP_INPUT_TOO_LARGE',
      `El DOCX excede el limite de ${limits.maxInputBytes} bytes.`
    );
  }

  if (buffer.length < 4 || buffer.readUInt32LE(0) !== ZIP_LOCAL_FILE_HEADER) {
    blockedFailure(
      'ZIP_PREFIX_FORBIDDEN',
      'El paquete DOCX debe comenzar exactamente con una cabecera local ZIP.'
    );
  }

  const eocdOffset = findEndOfCentralDirectory(buffer);
  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryBytes = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (
    entryCount === 0xffff ||
    entriesOnDisk === 0xffff ||
    centralDirectoryBytes === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    blockedFailure(
      'ZIP64_UNSUPPORTED',
      'ZIP64 no pertenece al perfil DOCX seguro de esta fase.'
    );
  }

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== entryCount
  ) {
    blockedFailure(
      'ZIP_MULTIDISK_UNSUPPORTED',
      'Los archivos ZIP divididos en varios discos no estan permitidos.'
    );
  }

  if (entryCount === 0 || entryCount > limits.maxEntries) {
    blockedFailure(
      'ZIP_ENTRY_COUNT_LIMIT',
      `El paquete declara ${entryCount} entradas; el limite es ${limits.maxEntries}.`
    );
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectoryBytes;
  if (
    !Number.isSafeInteger(centralDirectoryEnd) ||
    centralDirectoryEnd !== eocdOffset
  ) {
    blockedFailure(
      'ZIP_CENTRAL_DIRECTORY_RANGE',
      'El directorio central ZIP apunta fuera del archivo.'
    );
  }

  const entries: CentralDirectoryEntry[] = [];
  const names = new Set<string>();
  let cursor = centralDirectoryOffset;
  let compressedBytes = 0;
  let expandedBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    assertBufferRange(
      buffer,
      cursor,
      46,
      'ZIP_CENTRAL_ENTRY_TRUNCATED',
      'Una entrada del directorio central esta truncada.'
    );

    if (buffer.readUInt32LE(cursor) !== ZIP_CENTRAL_DIRECTORY_HEADER) {
      blockedFailure(
        'ZIP_CENTRAL_ENTRY_INVALID',
        'El directorio central contiene una entrada invalida.'
      );
    }

    const versionMadeBy = buffer.readUInt16LE(cursor + 4);
    const flags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const expanded = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const diskStart = buffer.readUInt16LE(cursor + 34);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const variableLength = nameLength + extraLength + commentLength;

    assertBufferRange(
      buffer,
      cursor + 46,
      variableLength,
      'ZIP_CENTRAL_ENTRY_TRUNCATED',
      'Una entrada del directorio central esta truncada.'
    );

    const nameBytes = buffer.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = decodeEntryName(nameBytes, flags);
    validateEntryPath(name, limits);
    validateGeneralPurposeFlags(flags, name);
    const isDirectory = name.endsWith('/');

    if (isDirectory && (compressed !== 0 || expanded !== 0 || crc !== 0)) {
      blockedFailure(
        'ZIP_DIRECTORY_DATA_FORBIDDEN',
        `La entrada de directorio ${name} contiene datos inesperados.`,
        name
      );
    }

    if (diskStart !== 0) {
      blockedFailure(
        'ZIP_MULTIDISK_UNSUPPORTED',
        `La entrada ${name} pertenece a otro disco ZIP.`,
        name
      );
    }

    if (compressed === 0xffffffff || expanded === 0xffffffff) {
      blockedFailure(
        'ZIP64_UNSUPPORTED',
        'ZIP64 no pertenece al perfil DOCX seguro de esta fase.',
        name
      );
    }

    if (localHeaderOffset === 0xffffffff) {
      blockedFailure(
        'ZIP64_UNSUPPORTED',
        'ZIP64 no pertenece al perfil DOCX seguro de esta fase.',
        name
      );
    }

    if (compressionMethod !== 0 && compressionMethod !== 8) {
      blockedFailure(
        'ZIP_COMPRESSION_UNSUPPORTED',
        `La entrada ${name} usa un metodo de compresion no permitido.`,
        name
      );
    }

    if (compressionMethod === 0 && compressed !== expanded) {
      blockedFailure(
        'ZIP_STORED_SIZE_MISMATCH',
        `La entrada almacenada ${name} declara tamanos incoherentes.`,
        name
      );
    }

    if (expanded > limits.maxEntryExpandedBytes) {
      blockedFailure(
        'ZIP_ENTRY_EXPANDED_LIMIT',
        `La entrada ${name} excede el limite expandido permitido.`,
        name
      );
    }

    if (ratio(expanded, compressed) > limits.maxCompressionRatio) {
      blockedFailure(
        'ZIP_ENTRY_RATIO_LIMIT',
        `La entrada ${name} excede el ratio de compresion permitido.`,
        name
      );
    }

    const canonicalName = name.normalize('NFC').toLocaleLowerCase('en-US');
    if (names.has(canonicalName)) {
      blockedFailure(
        'ZIP_DUPLICATE_PART',
        `El paquete contiene la parte duplicada o ambigua ${name}.`,
        name
      );
    }
    names.add(canonicalName);

    const madeByPlatform = versionMadeBy >>> 8;
    const unixMode = externalAttributes >>> 16;
    if (madeByPlatform === 3 && (unixMode & 0xf000) === 0xa000) {
      blockedFailure(
        'ZIP_SYMLINK_FORBIDDEN',
        `La entrada ${name} es un enlace simbolico.`,
        name
      );
    }

    const extra = buffer.subarray(
      cursor + 46 + nameLength,
      cursor + 46 + nameLength + extraLength
    );
    rejectZip64ExtraField(extra, name);

    compressedBytes += compressed;
    expandedBytes += expanded;
    if (
      !Number.isSafeInteger(compressedBytes) ||
      !Number.isSafeInteger(expandedBytes) ||
      expandedBytes > limits.maxExpandedBytes
    ) {
      blockedFailure(
        'ZIP_TOTAL_EXPANDED_LIMIT',
        `El paquete excede el limite expandido de ${limits.maxExpandedBytes} bytes.`
      );
    }

    entries.push({
      name,
      nameBytes: Buffer.from(nameBytes),
      flags,
      compressionMethod,
      crc32: crc,
      compressedBytes: compressed,
      expandedBytes: expanded,
      localHeaderOffset,
      dataOffset: 0,
      physicalEnd: 0,
      isDirectory,
    });

    cursor += 46 + variableLength;
  }

  if (cursor !== centralDirectoryEnd) {
    blockedFailure(
      'ZIP_CENTRAL_DIRECTORY_SIZE_MISMATCH',
      'El tamano declarado del directorio central no coincide con sus entradas.'
    );
  }

  if (ratio(expandedBytes, compressedBytes) > limits.maxCompressionRatio) {
    blockedFailure(
      'ZIP_TOTAL_RATIO_LIMIT',
      'El paquete excede el ratio total de compresion permitido.'
    );
  }

  const availableNames = new Set(
    entries.filter(entry => !entry.isDirectory).map(entry => entry.name)
  );
  for (const required of REQUIRED_PARTS) {
    if (!availableNames.has(required)) {
      blockedFailure(
        'OPC_REQUIRED_PART_MISSING',
        `Falta la parte OPC obligatoria ${required}.`,
        required
      );
    }
  }

  validateLocalHeaders(buffer, entries, centralDirectoryOffset);

  return {
    entries,
    centralDirectoryOffset,
    compressedBytes,
    expandedBytes,
  };
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (buffer: Buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
};

const expandEntry = (archive: Buffer, entry: CentralDirectoryEntry): Buffer => {
  const compressed = archive.subarray(
    entry.dataOffset,
    entry.dataOffset + entry.compressedBytes
  );
  let expanded: Buffer;

  try {
    expanded =
      entry.compressionMethod === 0
        ? compressed
        : inflateRawSync(compressed, {
            maxOutputLength: Math.max(1, entry.expandedBytes + 1),
          });
  } catch (error) {
    blockedFailure(
      'ZIP_DECOMPRESSION_FAILED',
      `No se pudo validar la entrada comprimida ${entry.name}.`,
      entry.name,
      error
    );
  }

  if (expanded.length !== entry.expandedBytes) {
    blockedFailure(
      'ZIP_EXPANDED_SIZE_MISMATCH',
      `La entrada ${entry.name} no coincide con su tamano expandido declarado.`,
      entry.name
    );
  }

  if (crc32(expanded) !== entry.crc32) {
    blockedFailure(
      'ZIP_CRC_MISMATCH',
      `La entrada ${entry.name} no supera la verificacion CRC.`,
      entry.name
    );
  }

  return expanded;
};

const decodeXml = (buffer: Buffer, part: string) => {
  try {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return new TextDecoder('utf-16le', { fatal: true }).decode(
        buffer.subarray(2)
      );
    }

    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      const body = buffer.subarray(2);
      if (body.length % 2 !== 0) {
        blockedFailure(
          'XML_ENCODING_INVALID',
          `La parte XML ${part} tiene una longitud UTF-16 invalida.`,
          part
        );
      }
      const swapped = Buffer.allocUnsafe(body.length);
      for (let offset = 0; offset < body.length; offset += 2) {
        swapped[offset] = body[offset + 1];
        swapped[offset + 1] = body[offset];
      }
      return new TextDecoder('utf-16le', { fatal: true }).decode(swapped);
    }

    const start =
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf
        ? 3
        : 0;
    return new TextDecoder('utf-8', { fatal: true }).decode(
      buffer.subarray(start)
    );
  } catch (error) {
    if (error instanceof InspectionFailure) throw error;
    blockedFailure(
      'XML_ENCODING_INVALID',
      `La parte XML ${part} no usa una codificacion admitida.`,
      part,
      error
    );
  }
};

const xmlLocalName = (name: string) => name.split(':').pop() ?? name;

const splitXmlQualifiedName = (name: string, part: string) => {
  const components = name.split(':');
  if (
    components.length > 2 ||
    components.some(component => component.length === 0)
  ) {
    blockedFailure(
      'XML_NAMESPACE_INVALID',
      `La parte XML ${part} contiene un nombre calificado invalido.`,
      part
    );
  }
  return components.length === 2
    ? { prefix: components[0], localName: components[1] }
    : { prefix: '', localName: components[0] };
};

const resolveTagNamespace = (
  tag: XmlTag,
  inheritedNamespaces: Readonly<Record<string, string>>,
  part: string
) => {
  const namespaces: Record<string, string> = { ...inheritedNamespaces };

  for (const [attributeName, value] of Object.entries(tag.attributes)) {
    if (attributeName === 'xmlns') {
      namespaces[''] = value;
      continue;
    }
    if (!attributeName.startsWith('xmlns:')) continue;

    const declaredPrefix = attributeName.slice('xmlns:'.length);
    if (
      !declaredPrefix ||
      declaredPrefix.includes(':') ||
      declaredPrefix === 'xmlns' ||
      (declaredPrefix === 'xml' && value !== XML_NAMESPACE) ||
      (declaredPrefix !== 'xml' && value === XML_NAMESPACE) ||
      !value
    ) {
      blockedFailure(
        'XML_NAMESPACE_INVALID',
        `La parte XML ${part} contiene una declaracion de namespace invalida.`,
        part
      );
    }
    namespaces[declaredPrefix] = value;
  }

  const { prefix } = splitXmlQualifiedName(tag.name, part);
  if (prefix && !Object.prototype.hasOwnProperty.call(namespaces, prefix)) {
    blockedFailure(
      'XML_NAMESPACE_UNDECLARED',
      `La parte XML ${part} usa un prefijo de namespace no declarado.`,
      part
    );
  }

  for (const attributeName of Object.keys(tag.attributes)) {
    if (attributeName === 'xmlns' || attributeName.startsWith('xmlns:')) {
      continue;
    }
    const attributeQualifiedName = splitXmlQualifiedName(attributeName, part);
    if (
      attributeQualifiedName.prefix &&
      !Object.prototype.hasOwnProperty.call(
        namespaces,
        attributeQualifiedName.prefix
      )
    ) {
      blockedFailure(
        'XML_NAMESPACE_UNDECLARED',
        `La parte XML ${part} usa un prefijo de atributo no declarado.`,
        part
      );
    }
  }

  return {
    tag: {
      ...tag,
      namespaceUri: namespaces[prefix] ?? '',
    },
    namespaces,
  };
};

const decodeXmlEntities = (value: string, part: string) => {
  let consumedUntil = 0;
  const decoded = value.replace(
    /&([^;]+);/g,
    (match, entity: string, offset: number) => {
      if (value.slice(consumedUntil, offset).includes('&')) {
        blockedFailure(
          'XML_ENTITY_FORBIDDEN',
          `La parte XML ${part} contiene una entidad no permitida.`,
          part
        );
      }
      consumedUntil = offset + match.length;

      const named: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
      };
      if (entity in named) return named[entity];

      const numeric = entity.startsWith('#x')
        ? Number.parseInt(entity.slice(2), 16)
        : entity.startsWith('#')
        ? Number.parseInt(entity.slice(1), 10)
        : Number.NaN;

      if (
        !Number.isInteger(numeric) ||
        numeric <= 0 ||
        numeric > 0x10ffff ||
        (numeric >= 0xd800 && numeric <= 0xdfff) ||
        (numeric < 0x20 &&
          numeric !== 0x09 &&
          numeric !== 0x0a &&
          numeric !== 0x0d)
      ) {
        blockedFailure(
          'XML_ENTITY_FORBIDDEN',
          `La parte XML ${part} contiene una entidad no permitida.`,
          part
        );
      }
      return String.fromCodePoint(numeric);
    }
  );

  if (value.slice(consumedUntil).includes('&')) {
    blockedFailure(
      'XML_ENTITY_FORBIDDEN',
      `La parte XML ${part} contiene una entidad no permitida.`,
      part
    );
  }
  return decoded;
};

const findMarkupEnd = (xml: string, start: number, part: string): number => {
  let quote = '';
  for (let cursor = start; cursor < xml.length; cursor += 1) {
    const character = xml[cursor];
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return cursor;
    }
  }
  blockedFailure(
    'XML_MALFORMED',
    `La parte XML ${part} contiene una etiqueta incompleta.`,
    part
  );
};

const parseOpeningTag = (raw: string, part: string) => {
  let cursor = 0;
  const skipSpace = () => {
    while (/\s/.test(raw[cursor] ?? '')) cursor += 1;
  };
  const readName = () => {
    const start = cursor;
    while (cursor < raw.length && !/[\s=/]/.test(raw[cursor])) cursor += 1;
    const name = raw.slice(start, cursor);
    if (!/^[:A-Za-z_][:A-Za-z0-9_.-]*$/.test(name)) {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene un nombre invalido.`,
        part
      );
    }
    return name;
  };

  skipSpace();
  const name = readName();
  const attributes: Record<string, string> = {};
  let selfClosing = false;

  while (cursor < raw.length) {
    skipSpace();
    if (cursor >= raw.length) break;
    if (raw[cursor] === '/') {
      cursor += 1;
      skipSpace();
      if (cursor !== raw.length) {
        blockedFailure(
          'XML_MALFORMED',
          `La parte XML ${part} contiene un cierre invalido.`,
          part
        );
      }
      selfClosing = true;
      break;
    }

    const attributeName = readName();
    skipSpace();
    if (raw[cursor] !== '=') {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene un atributo sin valor.`,
        part
      );
    }
    cursor += 1;
    skipSpace();
    const quote = raw[cursor];
    if (quote !== '"' && quote !== "'") {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene un atributo sin comillas.`,
        part
      );
    }
    cursor += 1;
    const valueStart = cursor;
    const valueEnd = raw.indexOf(quote, valueStart);
    if (valueEnd < 0) {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene un atributo incompleto.`,
        part
      );
    }
    if (Object.prototype.hasOwnProperty.call(attributes, attributeName)) {
      blockedFailure(
        'XML_DUPLICATE_ATTRIBUTE',
        `La parte XML ${part} contiene un atributo duplicado.`,
        part
      );
    }
    if (raw.slice(valueStart, valueEnd).includes('<')) {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene un atributo invalido.`,
        part
      );
    }
    attributes[attributeName] = decodeXmlEntities(
      raw.slice(valueStart, valueEnd),
      part
    );
    cursor = valueEnd + 1;
  }

  return { tag: { name, attributes }, selfClosing };
};

const containsForbiddenXmlControl = (xml: string) => {
  for (let index = 0; index < xml.length; index += 1) {
    const code = xml.charCodeAt(index);
    if (
      code === 0 ||
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d)
    ) {
      return true;
    }
  }
  return false;
};

const scanXml = (
  xml: string,
  part: string,
  selectedLocalNames: ReadonlySet<string>,
  limits: DocxInspectionLimits
): XmlScanResult => {
  if (containsForbiddenXmlControl(xml)) {
    blockedFailure(
      'XML_NUL_FORBIDDEN',
      `La parte XML ${part} contiene un caracter NUL.`,
      part
    );
  }

  const stack: string[] = [];
  const namespaceStack: Readonly<Record<string, string>>[] = [];
  const selected: XmlTag[] = [];
  let root: XmlTag | undefined;
  let cursor = 0;
  let tagCount = 0;

  while (cursor < xml.length) {
    const markupStart = xml.indexOf('<', cursor);
    const textEnd = markupStart < 0 ? xml.length : markupStart;
    const text = xml.slice(cursor, textEnd);
    if (text.includes(']]>')) {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene un cierre CDATA fuera de CDATA.`,
        part
      );
    }
    if (text.trim() && stack.length === 0) {
      blockedFailure(
        'XML_MALFORMED',
        `La parte XML ${part} contiene texto fuera del elemento raiz.`,
        part
      );
    }
    decodeXmlEntities(text, part);
    if (markupStart < 0) break;

    if (xml.startsWith('<!--', markupStart)) {
      const end = xml.indexOf('-->', markupStart + 4);
      if (end < 0 || xml.slice(markupStart + 4, end).includes('--')) {
        blockedFailure(
          'XML_MALFORMED',
          `La parte XML ${part} contiene un comentario invalido.`,
          part
        );
      }
      cursor = end + 3;
      continue;
    }

    if (xml.startsWith('<![CDATA[', markupStart)) {
      if (stack.length === 0) {
        blockedFailure(
          'XML_MALFORMED',
          `La parte XML ${part} contiene CDATA fuera del elemento raiz.`,
          part
        );
      }
      const end = xml.indexOf(']]>', markupStart + 9);
      if (end < 0) {
        blockedFailure(
          'XML_MALFORMED',
          `La parte XML ${part} contiene CDATA incompleto.`,
          part
        );
      }
      cursor = end + 3;
      continue;
    }

    if (xml.startsWith('<?', markupStart)) {
      const end = xml.indexOf('?>', markupStart + 2);
      if (end < 0) {
        blockedFailure(
          'XML_MALFORMED',
          `La parte XML ${part} contiene una instruccion incompleta.`,
          part
        );
      }
      cursor = end + 2;
      continue;
    }

    if (xml.startsWith('<!', markupStart)) {
      blockedFailure(
        'XML_DTD_FORBIDDEN',
        `La parte XML ${part} contiene DTD o entidades declaradas.`,
        part
      );
    }

    const markupEnd = findMarkupEnd(xml, markupStart + 1, part);
    const raw = xml.slice(markupStart + 1, markupEnd);
    tagCount += 1;
    if (tagCount > limits.maxXmlTags) {
      blockedFailure(
        'XML_TAG_LIMIT',
        `La parte XML ${part} excede el limite de etiquetas.`,
        part
      );
    }

    if (raw.trimStart().startsWith('/')) {
      const closingName = raw.trim().slice(1).trim();
      if (
        !/^[:A-Za-z_][:A-Za-z0-9_.-]*$/.test(closingName) ||
        stack.pop() !== closingName
      ) {
        blockedFailure(
          'XML_MALFORMED',
          `La parte XML ${part} contiene etiquetas desbalanceadas.`,
          part
        );
      }
      namespaceStack.pop();
    } else {
      const parsed = parseOpeningTag(raw, part);
      const resolved = resolveTagNamespace(
        parsed.tag,
        namespaceStack.at(-1) ?? { xml: XML_NAMESPACE },
        part
      );
      const tag = resolved.tag;
      if (!root) {
        root = tag;
      } else if (stack.length === 0) {
        blockedFailure(
          'XML_MULTIPLE_ROOTS',
          `La parte XML ${part} contiene mas de un elemento raiz.`,
          part
        );
      }

      if (selectedLocalNames.has(xmlLocalName(tag.name))) {
        if (stack.length !== 1) {
          blockedFailure(
            'XML_SCHEMA_SHAPE_INVALID',
            `La parte XML ${part} contiene un elemento en una ubicacion invalida.`,
            part
          );
        }
        selected.push(tag);
      }

      if (!parsed.selfClosing) {
        stack.push(tag.name);
        namespaceStack.push(resolved.namespaces);
        if (stack.length > limits.maxXmlDepth) {
          blockedFailure(
            'XML_DEPTH_LIMIT',
            `La parte XML ${part} excede la profundidad permitida.`,
            part
          );
        }
      }
    }

    cursor = markupEnd + 1;
  }

  if (!root || stack.length !== 0) {
    blockedFailure(
      'XML_MALFORMED',
      `La parte XML ${part} no tiene una estructura completa.`,
      part
    );
  }

  return { root, selected };
};

const opcAttribute = (tag: XmlTag, name: string, part: string) => {
  const shadowingAliases = Object.keys(tag.attributes).filter(
    attributeName =>
      attributeName !== name && xmlLocalName(attributeName) === name
  );
  if (shadowingAliases.length > 0) {
    blockedFailure(
      'OPC_ATTRIBUTE_NAMESPACE_INVALID',
      `La parte ${part} intenta suplantar el atributo OPC ${name} con un atributo prefijado.`,
      part
    );
  }
  return tag.attributes[name];
};

const rootNamespace = (tag: XmlTag) => tag.namespaceUri;

const requireOpcElementNamespace = (
  tag: XmlTag,
  expectedNamespace: string,
  part: string
) => {
  if (tag.namespaceUri !== expectedNamespace) {
    blockedFailure(
      'OPC_ELEMENT_NAMESPACE_INVALID',
      `La parte ${part} contiene el elemento ${tag.name} fuera del namespace OPC esperado.`,
      part
    );
  }
};

const parseContentTypes = (
  scan: XmlScanResult,
  limits: DocxInspectionLimits
) => {
  if (
    xmlLocalName(scan.root.name) !== 'Types' ||
    rootNamespace(scan.root) !== OPC_CONTENT_TYPES_NAMESPACE
  ) {
    blockedFailure(
      'OPC_CONTENT_TYPES_ROOT_INVALID',
      '[Content_Types].xml no contiene un elemento Types valido.',
      '[Content_Types].xml'
    );
  }

  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();

  for (const tag of scan.selected) {
    requireOpcElementNamespace(
      tag,
      OPC_CONTENT_TYPES_NAMESPACE,
      '[Content_Types].xml'
    );
    const localName = xmlLocalName(tag.name);
    const contentType = opcAttribute(
      tag,
      'ContentType',
      '[Content_Types].xml'
    )?.trim();
    if (!contentType) {
      blockedFailure(
        'OPC_CONTENT_TYPE_INVALID',
        'El manifiesto OPC contiene un tipo de contenido vacio.',
        '[Content_Types].xml'
      );
    }

    if (localName === 'Default') {
      const extension = opcAttribute(tag, 'Extension', '[Content_Types].xml')
        ?.trim()
        .toLowerCase();
      if (!extension || defaults.has(extension)) {
        blockedFailure(
          'OPC_CONTENT_TYPE_DUPLICATE',
          'El manifiesto OPC contiene una extension duplicada o invalida.',
          '[Content_Types].xml'
        );
      }
      defaults.set(extension, contentType);
      continue;
    }

    const partName = opcAttribute(
      tag,
      'PartName',
      '[Content_Types].xml'
    )?.trim();
    if (!partName?.startsWith('/')) {
      blockedFailure(
        'OPC_CONTENT_TYPE_PART_INVALID',
        'El manifiesto OPC contiene un PartName invalido.',
        '[Content_Types].xml'
      );
    }
    const normalizedPart = partName.slice(1);
    validateEntryPath(normalizedPart, limits);
    const key = normalizedPart.toLocaleLowerCase('en-US');
    if (overrides.has(key)) {
      blockedFailure(
        'OPC_CONTENT_TYPE_DUPLICATE',
        `El manifiesto OPC repite la parte ${partName}.`,
        '[Content_Types].xml'
      );
    }
    overrides.set(key, contentType);
  }

  return { defaults, overrides };
};

const resolveContentType = (
  partName: string,
  contentTypes: ReturnType<typeof parseContentTypes>
) => {
  const override = contentTypes.overrides.get(
    partName.toLocaleLowerCase('en-US')
  );
  if (override) return override;
  const extension = partName.includes('.')
    ? partName.slice(partName.lastIndexOf('.') + 1).toLowerCase()
    : '';
  return contentTypes.defaults.get(extension);
};

const relationshipSource = (relationshipPart: string): string => {
  if (relationshipPart === '_rels/.rels') return '/';
  const match = relationshipPart.match(/^(.*\/)_rels\/([^/]+)\.rels$/);
  if (!match) {
    blockedFailure(
      'OPC_RELATIONSHIP_PART_INVALID',
      `La parte de relaciones ${relationshipPart} no tiene una ruta OPC valida.`,
      relationshipPart
    );
  }
  return `${match[1]}${match[2]}`;
};

const resolveInternalTarget = (
  source: string,
  target: string
): string | undefined => {
  const withoutFragment = target.split('#', 1)[0];
  if (!withoutFragment) return undefined;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(withoutFragment)) {
    blockedFailure(
      'OPC_INTERNAL_TARGET_ABSOLUTE',
      `La relacion interna desde ${source} contiene una URI absoluta.`
    );
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch (error) {
    blockedFailure(
      'OPC_RELATIONSHIP_TARGET_INVALID',
      `La relacion desde ${source} contiene escapes invalidos.`,
      source === '/' ? '_rels/.rels' : source,
      error
    );
  }

  if (decoded.includes('\\') || decoded.includes('\0')) {
    blockedFailure(
      'OPC_RELATIONSHIP_TARGET_INVALID',
      `La relacion desde ${source} contiene una ruta insegura.`,
      source === '/' ? '_rels/.rels' : source
    );
  }

  const baseSegments =
    source === '/' ? [] : path.posix.dirname(source).split('/').filter(Boolean);
  const targetSegments = decoded.split('/');
  const resolvedSegments = decoded.startsWith('/') ? [] : [...baseSegments];
  for (const segment of targetSegments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (resolvedSegments.length === 0) {
        blockedFailure(
          'OPC_RELATIONSHIP_TARGET_INVALID',
          `La relacion desde ${source} sale del paquete OPC.`,
          source === '/' ? '_rels/.rels' : source
        );
      }
      resolvedSegments.pop();
      continue;
    }
    resolvedSegments.push(segment);
  }
  const resolved = `/${resolvedSegments.join('/')}`;
  if (!resolved.startsWith('/') || resolved === '/') {
    blockedFailure(
      'OPC_RELATIONSHIP_TARGET_INVALID',
      `La relacion desde ${source} sale del paquete OPC.`,
      source === '/' ? '_rels/.rels' : source
    );
  }
  return resolved.slice(1);
};

const isBlockedPart = (name: string, contentType?: string) => {
  const normalized = `${name} ${contentType ?? ''}`.toLowerCase();
  if (
    normalized.includes('vbaproject') ||
    normalized.includes('macroenabled')
  ) {
    return 'macros' as const;
  }
  if (normalized.includes('/activex') || normalized.includes('activex')) {
    return 'activeX' as const;
  }
  if (
    normalized.includes('/embeddings/') ||
    normalized.includes('oleobject') ||
    normalized.includes('ms-office.package')
  ) {
    return 'oleObjects' as const;
  }
  return undefined;
};

const isCorePreservablePart = (name: string) =>
  REQUIRED_PARTS.has(name) ||
  name.endsWith('.rels') ||
  /^docProps\/(?:app|core|custom)\.xml$/i.test(name) ||
  /^word\/(?:styles|numbering|settings|fontTable|webSettings)\.xml$/i.test(
    name
  ) ||
  /^word\/(?:header|footer)\d+\.xml$/i.test(name) ||
  /^word\/theme\/theme\d+\.xml$/i.test(name) ||
  /^word\/media\/.+/i.test(name);

const classifyRelationshipType = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes('vbaproject')) return 'macros' as const;
  if (normalized.includes('activex') || normalized.endsWith('/control')) {
    return 'activeX' as const;
  }
  if (normalized.includes('oleobject') || normalized.endsWith('/package')) {
    return 'oleObjects' as const;
  }
  return undefined;
};

const addIssue = (
  issues: DocxInspectionIssue[],
  issue: DocxInspectionIssue
) => {
  if (issues.length < MAX_REPORTED_ISSUES) issues.push(issue);
};

const emptyReport = (buffer: Buffer): DocxInspectionReport => ({
  verdict: 'blocked',
  editingGate: 'blocked',
  requiresOpaquePreservation: false,
  sha256: sha256(buffer),
  byteLength: buffer.length,
  ooxmlConformance: 'unknown',
  package: {
    entryCount: 0,
    compressedBytes: 0,
    expandedBytes: 0,
    compressionRatio: 0,
  },
  flags: {
    encrypted: false,
    macros: false,
    activeX: false,
    oleObjects: false,
    externalRelationships: false,
  },
  parts: [],
  relationships: [],
  issues: [],
});

export const inspectDocxPackage = (
  buffer: Buffer,
  limitOverrides: Partial<DocxInspectionLimits> = {}
): DocxInspectionReport => {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('inspectDocxPackage requiere un Buffer.');
  }

  const limits = normalizeLimits(limitOverrides);
  const report = emptyReport(buffer);
  let archive: ParsedArchive | undefined;

  try {
    if (
      buffer.length >= COMPOUND_FILE_BINARY_SIGNATURE.length &&
      buffer
        .subarray(0, COMPOUND_FILE_BINARY_SIGNATURE.length)
        .equals(COMPOUND_FILE_BINARY_SIGNATURE)
    ) {
      blockedFailure(
        'CFB_CONTAINER_BLOCKED',
        'El archivo usa un contenedor CFB binario que no puede inspeccionarse como DOCX/OPC; la firma por si sola no demuestra cifrado.'
      );
    }

    archive = parseCentralDirectory(buffer, limits);
    report.package = {
      entryCount: archive.entries.length,
      compressedBytes: archive.compressedBytes,
      expandedBytes: archive.expandedBytes,
      compressionRatio: ratio(archive.expandedBytes, archive.compressedBytes),
    };

    const xmlScans = new Map<string, XmlScanResult>();
    for (const entry of archive.entries) {
      if (entry.isDirectory) continue;
      const expanded = expandEntry(buffer, entry);
      const isXml = entry.name.endsWith('.xml') || entry.name.endsWith('.rels');
      if (!isXml) continue;
      if (expanded.length > limits.maxXmlBytes) {
        blockedFailure(
          'XML_SIZE_LIMIT',
          `La parte XML ${entry.name} excede el limite permitido.`,
          entry.name
        );
      }

      const selectedNames =
        entry.name === '[Content_Types].xml'
          ? new Set(['Default', 'Override'])
          : entry.name.endsWith('.rels')
          ? new Set(['Relationship'])
          : new Set<string>();
      xmlScans.set(
        entry.name,
        scanXml(
          decodeXml(expanded, entry.name),
          entry.name,
          selectedNames,
          limits
        )
      );
    }

    const contentTypesScan = xmlScans.get('[Content_Types].xml');
    const documentScan = xmlScans.get('word/document.xml');
    if (!contentTypesScan || !documentScan) {
      blockedFailure(
        'OPC_REQUIRED_XML_UNREADABLE',
        'No fue posible leer las partes XML obligatorias del DOCX.'
      );
    }
    const contentTypes = parseContentTypes(contentTypesScan, limits);
    const entryNames = new Set(
      archive.entries
        .filter(entry => !entry.isDirectory)
        .map(entry => entry.name)
    );

    for (const entry of archive.entries) {
      if (entry.isDirectory || entry.name === '[Content_Types].xml') continue;
      if (!resolveContentType(entry.name, contentTypes)) {
        blockedFailure(
          'OPC_CONTENT_TYPE_MISSING',
          `No existe un tipo de contenido para ${entry.name}.`,
          entry.name
        );
      }
    }

    const relationships: OpcRelationshipInspection[] = [];
    let relationshipCount = 0;
    let officeDocumentRelationshipCount = 0;
    let rootOfficeDocumentRelationship: string | undefined;
    let relationshipConformance: OoxmlConformance = 'unknown';

    for (const [relationshipPart, scan] of xmlScans) {
      if (!relationshipPart.endsWith('.rels')) continue;
      if (
        xmlLocalName(scan.root.name) !== 'Relationships' ||
        rootNamespace(scan.root) !== OPC_RELATIONSHIPS_NAMESPACE
      ) {
        blockedFailure(
          'OPC_RELATIONSHIPS_ROOT_INVALID',
          `La parte ${relationshipPart} no contiene Relationships.`,
          relationshipPart
        );
      }

      const source = relationshipSource(relationshipPart);
      const ids = new Set<string>();
      for (const tag of scan.selected) {
        requireOpcElementNamespace(
          tag,
          OPC_RELATIONSHIPS_NAMESPACE,
          relationshipPart
        );
        relationshipCount += 1;
        if (relationshipCount > limits.maxRelationships) {
          blockedFailure(
            'OPC_RELATIONSHIP_LIMIT',
            'El paquete excede el limite de relaciones OPC.'
          );
        }

        const id = opcAttribute(tag, 'Id', relationshipPart)?.trim();
        const type = opcAttribute(tag, 'Type', relationshipPart)?.trim();
        const target = opcAttribute(tag, 'Target', relationshipPart)?.trim();
        const rawMode = opcAttribute(
          tag,
          'TargetMode',
          relationshipPart
        )?.trim();
        if (!id || !type || !target || ids.has(id)) {
          blockedFailure(
            'OPC_RELATIONSHIP_INVALID',
            `La parte ${relationshipPart} contiene una relacion incompleta o duplicada.`,
            relationshipPart
          );
        }
        ids.add(id);

        if (rawMode && rawMode.toLowerCase() !== 'external') {
          blockedFailure(
            'OPC_RELATIONSHIP_MODE_INVALID',
            `La relacion ${id} tiene un TargetMode invalido.`,
            relationshipPart
          );
        }

        const targetMode = rawMode ? 'External' : 'Internal';
        let disposition: DocxCompatibility = 'compatible';
        let resolvedTarget: string | undefined;

        if (targetMode === 'External') {
          disposition = 'blocked';
          report.flags.externalRelationships = true;
          addIssue(report.issues, {
            code: 'OPC_EXTERNAL_RELATIONSHIP',
            severity: 'error',
            disposition: 'blocked',
            message: `La relacion ${id} apunta fuera del paquete y requiere autorizacion explicita.`,
            part: relationshipPart,
          });
        } else {
          resolvedTarget = resolveInternalTarget(source, target);
          if (resolvedTarget && !entryNames.has(resolvedTarget)) {
            blockedFailure(
              'OPC_RELATIONSHIP_TARGET_MISSING',
              `La relacion ${id} apunta a la parte inexistente ${resolvedTarget}.`,
              relationshipPart
            );
          }
        }

        const blockedFeature = classifyRelationshipType(type);
        if (blockedFeature) {
          disposition = 'blocked';
          report.flags[blockedFeature] = true;
          addIssue(report.issues, {
            code: `OPC_${blockedFeature.toUpperCase()}_RELATIONSHIP`,
            severity: 'error',
            disposition: 'blocked',
            message: `La relacion ${id} referencia contenido activo o incrustado bloqueado.`,
            part: relationshipPart,
          });
        }

        if (
          source === '/' &&
          type === TRANSITIONAL_OFFICE_DOCUMENT_RELATIONSHIP
        ) {
          officeDocumentRelationshipCount += 1;
          rootOfficeDocumentRelationship = resolvedTarget;
          relationshipConformance = 'transitional';
        } else if (
          source === '/' &&
          type === STRICT_OFFICE_DOCUMENT_RELATIONSHIP
        ) {
          officeDocumentRelationshipCount += 1;
          rootOfficeDocumentRelationship = resolvedTarget;
          relationshipConformance = 'strict';
        }

        relationships.push({
          source,
          id,
          type,
          target,
          targetMode,
          ...(resolvedTarget ? { resolvedTarget } : {}),
          disposition,
        });
      }
    }

    if (
      officeDocumentRelationshipCount !== 1 ||
      rootOfficeDocumentRelationship !== 'word/document.xml'
    ) {
      blockedFailure(
        'OPC_OFFICE_DOCUMENT_RELATIONSHIP_MISSING',
        'La relacion raiz officeDocument no apunta a word/document.xml.',
        '_rels/.rels'
      );
    }
    report.relationships = relationships;

    const documentRootNamespace = rootNamespace(documentScan.root);
    const documentConformance: OoxmlConformance =
      documentRootNamespace === STRICT_WORD_NAMESPACE
        ? 'strict'
        : documentRootNamespace === TRANSITIONAL_WORD_NAMESPACE
        ? 'transitional'
        : 'unknown';

    report.ooxmlConformance =
      documentConformance === 'unknown' || relationshipConformance === 'unknown'
        ? 'unknown'
        : documentConformance === relationshipConformance
        ? documentConformance
        : 'mixed';

    if (
      xmlLocalName(documentScan.root.name) !== 'document' ||
      report.ooxmlConformance === 'unknown'
    ) {
      blockedFailure(
        'OOXML_WORD_NAMESPACE_UNSUPPORTED',
        'word/document.xml no declara un documento WordprocessingML admitido.',
        'word/document.xml'
      );
    }
    if (report.ooxmlConformance === 'mixed') {
      blockedFailure(
        'OOXML_MIXED_CONFORMANCE',
        'El paquete mezcla identificadores Strict y Transitional.'
      );
    }

    report.parts = archive.entries.map(entry => {
      const contentType = entry.isDirectory
        ? undefined
        : resolveContentType(entry.name, contentTypes);
      const blockedFeature = isBlockedPart(entry.name, contentType);
      let disposition: DocxCompatibility = 'compatible';

      if (blockedFeature) {
        disposition = 'blocked';
        report.flags[blockedFeature] = true;
        addIssue(report.issues, {
          code: `OPC_${blockedFeature.toUpperCase()}_PART`,
          severity: 'error',
          disposition: 'blocked',
          message: `La parte ${entry.name} contiene contenido activo o incrustado bloqueado.`,
          part: entry.name,
        });
      } else if (!entry.isDirectory && !isCorePreservablePart(entry.name)) {
        disposition = 'preserved';
        addIssue(report.issues, {
          code: 'OPC_OPAQUE_PART_PRESERVED',
          severity: 'warning',
          disposition: 'preserved',
          message: `La parte ${entry.name} se conserva opaca y no se edita en esta fase.`,
          part: entry.name,
        });
      }

      return {
        name: entry.name,
        compressedBytes: entry.compressedBytes,
        expandedBytes: entry.expandedBytes,
        compressionRatio: ratio(entry.expandedBytes, entry.compressedBytes),
        crc32: entry.crc32.toString(16).padStart(8, '0'),
        ...(contentType ? { contentType } : {}),
        disposition,
      };
    });

    const hasBlockedContent =
      report.parts.some(part => part.disposition === 'blocked') ||
      report.relationships.some(
        relationship => relationship.disposition === 'blocked'
      ) ||
      Object.values(report.flags).some(Boolean) ||
      report.issues.some(issue => issue.disposition === 'blocked');
    const hasPreservedContent =
      report.parts.some(part => part.disposition === 'preserved') ||
      report.relationships.some(
        relationship => relationship.disposition === 'preserved'
      ) ||
      report.issues.some(issue => issue.disposition === 'preserved');

    // `issues` es una muestra acotada para diagnóstico. La puerta nunca puede
    // depender solo de esa lista porque contenido bloqueado podría aparecer
    // después de MAX_REPORTED_ISSUES advertencias preservativas.
    report.verdict = hasBlockedContent
      ? 'blocked'
      : hasPreservedContent
      ? 'preserved'
      : 'compatible';
    report.editingGate =
      report.verdict === 'compatible'
        ? 'eligible'
        : report.verdict === 'preserved'
        ? 'requires-opaque-preservation-engine'
        : 'blocked';
    report.requiresOpaquePreservation = report.parts.some(
      partInspection => partInspection.disposition === 'preserved'
    );
    return report;
  } catch (error) {
    const issue =
      error instanceof InspectionFailure
        ? error.issue
        : {
            code: 'DOCX_INSPECTION_FAILED',
            severity: 'error' as const,
            disposition: 'blocked' as const,
            message: 'El paquete DOCX no pudo inspeccionarse de forma segura.',
          };
    addIssue(report.issues, issue);
    report.flags.encrypted = report.issues.some(
      inspectionIssue => inspectionIssue.code === 'ZIP_ENCRYPTED_ENTRY'
    );
    if (archive && report.parts.length === 0) {
      report.parts = archive.entries.map(entry => ({
        name: entry.name,
        compressedBytes: entry.compressedBytes,
        expandedBytes: entry.expandedBytes,
        compressionRatio: ratio(entry.expandedBytes, entry.compressedBytes),
        crc32: entry.crc32.toString(16).padStart(8, '0'),
        disposition: 'blocked',
      }));
    }
    report.verdict = 'blocked';
    report.editingGate = 'blocked';
    return report;
  }
};

export const preserveDocxNoOp = (
  buffer: Buffer,
  limitOverrides: Partial<DocxInspectionLimits> = {}
): DocxNoOpRoundTrip => {
  const inspection = inspectDocxPackage(buffer, limitOverrides);
  return {
    buffer,
    sha256: inspection.sha256,
    byteLength: buffer.length,
    byteIdentical: true,
    inspection,
  };
};
