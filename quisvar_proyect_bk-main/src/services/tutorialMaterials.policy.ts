import path from 'path';

export const TUTORIAL_MATERIAL_MAX_FILES = 15;
export const TUTORIAL_MATERIAL_MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
export const TUTORIAL_MATERIAL_STANDARD_MAX_BYTES = 500 * 1024 * 1024;
export const TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES = 500 * 1024 * 1024;
export const TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES = 1024 * 1024 * 1024;

export const TUTORIAL_MATERIAL_BLOCKED_EXTENSIONS = new Set([
  'exe',
  'msi',
  'bat',
  'cmd',
  'com',
  'scr',
  'ps1',
  'sh',
  'js',
  'html',
  'htm',
  'php',
  'jar',
  'apk',
]);

type TutorialMaterialCategory = 'standard' | 'technical' | 'archive';

interface TutorialMaterialSpec {
  category: TutorialMaterialCategory;
  maxBytes: number;
  mimeTypes: ReadonlySet<string>;
}

const mimeTypes = (...values: string[]) =>
  new Set(values.map(value => value.toLowerCase()));

const GENERIC_BINARY_MIME = 'application/octet-stream';

const MATERIAL_SPECS: Readonly<Record<string, TutorialMaterialSpec>> = {
  pdf: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('application/pdf', GENERIC_BINARY_MIME),
  },
  docx: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      GENERIC_BINARY_MIME
    ),
  },
  xlsx: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/zip',
      GENERIC_BINARY_MIME
    ),
  },
  xls: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('application/vnd.ms-excel', GENERIC_BINARY_MIME),
  },
  xlsm: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/vnd.ms-excel.sheet.macroenabled.12',
      'application/vnd.ms-excel',
      'application/zip',
      GENERIC_BINARY_MIME
    ),
  },
  csv: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes(
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      GENERIC_BINARY_MIME
    ),
  },
  txt: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('text/plain', GENERIC_BINARY_MIME),
  },
  pptx: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      GENERIC_BINARY_MIME
    ),
  },
  jpg: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('image/jpeg', GENERIC_BINARY_MIME),
  },
  jpeg: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('image/jpeg', GENERIC_BINARY_MIME),
  },
  png: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('image/png', GENERIC_BINARY_MIME),
  },
  webp: {
    category: 'standard',
    maxBytes: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    mimeTypes: mimeTypes('image/webp', GENERIC_BINARY_MIME),
  },
  dwg: {
    category: 'technical',
    maxBytes: TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES,
    mimeTypes: mimeTypes(
      'image/vnd.dwg',
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'application/dwg',
      'application/x-dwg',
      GENERIC_BINARY_MIME
    ),
  },
  dxf: {
    category: 'technical',
    maxBytes: TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES,
    mimeTypes: mimeTypes(
      'image/vnd.dxf',
      'application/dxf',
      'application/x-dxf',
      'application/x-autocad',
      'text/plain',
      GENERIC_BINARY_MIME
    ),
  },
  xml: {
    category: 'technical',
    maxBytes: TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/xml',
      'text/xml',
      'text/plain',
      GENERIC_BINARY_MIME
    ),
  },
  pkt: {
    category: 'technical',
    maxBytes: TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/zip',
      'application/x-zip-compressed',
      GENERIC_BINARY_MIME
    ),
  },
  zip: {
    category: 'archive',
    maxBytes: TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
      GENERIC_BINARY_MIME
    ),
  },
  rar: {
    category: 'archive',
    maxBytes: TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES,
    mimeTypes: mimeTypes(
      'application/vnd.rar',
      'application/x-rar-compressed',
      GENERIC_BINARY_MIME
    ),
  },
};

export const TUTORIAL_MATERIAL_ALLOWED_EXTENSIONS = Object.freeze(
  Object.keys(MATERIAL_SPECS)
);

export interface TutorialMaterialFileInput {
  originalname: string;
  mimetype: string;
  size: number;
}

export interface TutorialMaterialStoredFile extends TutorialMaterialFileInput {
  path: string;
}

export const tutorialMaterialsDirectory = () =>
  path.resolve('public/tutorials/docs');

export const resolveTutorialMaterialPath = (storedName: string) => {
  const basename = path.basename(storedName);
  if (!basename || basename !== storedName) {
    throw new Error('Ruta de material adjunto no válida.');
  }
  return path.join(tutorialMaterialsDirectory(), basename);
};

export const tutorialMaterialExtension = (filename: string) =>
  path.extname(filename).slice(1).toLowerCase();

export const formatTutorialMaterialBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    const value = bytes / (1024 * 1024 * 1024);
    return `${
      Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
    } GB`;
  }
  if (bytes >= 1024 * 1024) {
    const value = bytes / (1024 * 1024);
    return `${
      Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
    } MB`;
  }
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} bytes`;
};

export const sanitizeTutorialMaterialName = (originalName: string) => {
  const basename = path
    .basename(originalName.replace(/\\/g, '/'))
    .normalize('NFKC');
  const withoutControlCharacters = Array.from(basename)
    .filter(character => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('');
  const withoutControls = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\$\$/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const extension = tutorialMaterialExtension(withoutControls);
  const fallback = extension ? `material.${extension}` : 'material';
  const safeName = withoutControls || fallback;

  if (safeName.length <= 180) return safeName;

  const suffix = extension ? `.${extension}` : '';
  const stem = path.basename(safeName, suffix).slice(0, 180 - suffix.length);
  return `${stem}${suffix}`;
};

export const validateTutorialMaterialMetadata = (
  file: TutorialMaterialFileInput
) => {
  const extension = tutorialMaterialExtension(file.originalname);
  const displayName = sanitizeTutorialMaterialName(file.originalname);

  if (TUTORIAL_MATERIAL_BLOCKED_EXTENSIONS.has(extension)) {
    return `${displayName}: la extensión .${extension} está bloqueada por seguridad.`;
  }

  const spec = MATERIAL_SPECS[extension];
  if (!spec) {
    return `${displayName}: el formato .${
      extension || 'sin extensión'
    } no está permitido.`;
  }

  const normalizedMime = (file.mimetype || GENERIC_BINARY_MIME).toLowerCase();
  if (!spec.mimeTypes.has(normalizedMime)) {
    return `${displayName}: el tipo de archivo ${normalizedMime} no coincide con el formato .${extension}.`;
  }

  if (file.size > spec.maxBytes) {
    const label =
      spec.category === 'technical'
        ? 'archivos técnicos'
        : spec.category === 'archive'
        ? 'archivos comprimidos'
        : 'este tipo de archivo';
    return `${displayName} pesa ${formatTutorialMaterialBytes(
      file.size
    )}. El límite para ${label} es ${formatTutorialMaterialBytes(
      spec.maxBytes
    )}.`;
  }

  return null;
};

const startsWithBytes = (buffer: Buffer, signature: number[]) =>
  signature.every((value, index) => buffer[index] === value);

const hasZipSignature = (buffer: Buffer) =>
  startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
  startsWithBytes(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
  startsWithBytes(buffer, [0x50, 0x4b, 0x07, 0x08]);

const zipContainsDirectory = (buffer: Buffer, directory: string) => {
  const content = buffer.toString('latin1').replace(/\\/g, '/').toLowerCase();
  return content.includes(`${directory.toLowerCase()}/`);
};

const containsActiveTextContent = (text: string) =>
  /<\s*(?:script|html|svg)\b|<\?php\b|javascript\s*:/i.test(text);

export const hasValidTutorialMaterialContent = (
  extension: string,
  buffer: Buffer
) => {
  if (buffer.length === 0) return false;

  switch (extension.toLowerCase()) {
    case 'pdf':
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'jpg':
    case 'jpeg':
      return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
    case 'png':
      return startsWithBytes(
        buffer,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      );
    case 'webp':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'docx':
      return hasZipSignature(buffer) && zipContainsDirectory(buffer, 'word');
    case 'xlsx':
    case 'xlsm':
      return hasZipSignature(buffer) && zipContainsDirectory(buffer, 'xl');
    case 'pptx':
      return hasZipSignature(buffer) && zipContainsDirectory(buffer, 'ppt');
    case 'pkt':
    case 'zip':
      return hasZipSignature(buffer);
    case 'xls':
      return startsWithBytes(
        buffer,
        [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
      );
    case 'rar':
      return (
        startsWithBytes(buffer, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]) ||
        startsWithBytes(
          buffer,
          [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]
        )
      );
    case 'dwg':
      return /^AC10\d{2}/.test(buffer.subarray(0, 6).toString('ascii'));
    case 'dxf': {
      const header = buffer.subarray(0, 4096).toString('latin1');
      return (
        header.startsWith('AutoCAD Binary DXF\r\n\u001a\u0000') ||
        /^\s*0\s*(?:\r?\n|\r)\s*SECTION\b/i.test(header)
      );
    }
    case 'xml': {
      const text = buffer
        .subarray(0, 64 * 1024)
        .toString('utf8')
        .replace(/^\uFEFF/, '')
        .trimStart();
      return text.startsWith('<') && !containsActiveTextContent(text);
    }
    case 'csv':
    case 'txt': {
      if (buffer.includes(0)) return false;
      const text = buffer.subarray(0, 64 * 1024).toString('utf8');
      return !text.includes('\uFFFD') && !containsActiveTextContent(text);
    }
    default:
      return false;
  }
};

export const validateTutorialMaterialContent = (
  file: TutorialMaterialFileInput,
  buffer: Buffer
) => {
  const extension = tutorialMaterialExtension(file.originalname);
  if (hasValidTutorialMaterialContent(extension, buffer)) return null;
  return `${sanitizeTutorialMaterialName(
    file.originalname
  )}: el contenido real no coincide con el formato .${extension}.`;
};

export const validateTutorialMaterialTotals = (
  existingSizes: number[],
  newFiles: TutorialMaterialFileInput[]
) => {
  const totalCount = existingSizes.length + newFiles.length;
  if (totalCount > TUTORIAL_MATERIAL_MAX_FILES) {
    return `El tutorial tendría ${totalCount} archivos. El máximo permitido es ${TUTORIAL_MATERIAL_MAX_FILES}.`;
  }

  const totalBytes =
    existingSizes.reduce((sum, size) => sum + size, 0) +
    newFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > TUTORIAL_MATERIAL_MAX_TOTAL_BYTES) {
    return `Los materiales sumarían ${formatTutorialMaterialBytes(
      totalBytes
    )}. El máximo acumulado por tutorial es 2 GB.`;
  }

  return null;
};

export const isTutorialMaterialImage = (filename: string) =>
  ['jpg', 'jpeg', 'png', 'webp'].includes(tutorialMaterialExtension(filename));
