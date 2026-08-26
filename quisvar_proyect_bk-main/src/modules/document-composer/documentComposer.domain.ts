import { z } from 'zod';
import AppError from '@/utils/appError';
import { DOCUMENT_COMPOSER_LIMITS } from './documentComposer.constants';
import type {
  DocumentManifest,
  DocumentManifestItem,
} from './documentComposer.types';

const itemIdSchema = z.string().trim().min(1).max(100);

const imageItemSchema = z.object({
  id: itemIdSchema,
  kind: z.literal('image'),
  fileKey: z.string().trim().min(1).max(180),
  order: z.number().int().positive(),
});

const pdfPageItemSchema = z.object({
  id: itemIdSchema,
  kind: z.literal('pdfPage'),
  sourceArtifactId: z.string().uuid(),
  pageNumber: z.number().int().positive(),
  order: z.number().int().positive(),
});

const manifestSchema = z.object({
  version: z.literal(1),
  items: z
    .array(z.discriminatedUnion('kind', [imageItemSchema, pdfPageItemSchema]))
    .min(1)
    .max(DOCUMENT_COMPOSER_LIMITS.maxPages),
});

export const parseDocumentManifest = (input: unknown): DocumentManifest => {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      throw new AppError(
        'El manifiesto no contiene JSON válido.',
        400,
        'DOCUMENT_MANIFEST_INVALID'
      );
    }
  }

  const parsed = manifestSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      'El manifiesto de páginas no es válido.',
      400,
      'DOCUMENT_MANIFEST_INVALID'
    );
  }

  validateManifestOrder(parsed.data.items);
  validateManifestDuplicates(parsed.data.items);
  return parsed.data;
};

export const validateManifestOrder = (items: DocumentManifestItem[]) => {
  const orders = items.map(item => item.order).sort((a, b) => a - b);
  const continuous = orders.every((order, index) => order === index + 1);
  if (!continuous) {
    throw new AppError(
      'El orden debe ser continuo y comenzar en 1.',
      400,
      'DOCUMENT_ORDER_INVALID'
    );
  }
};

export const validateManifestDuplicates = (items: DocumentManifestItem[]) => {
  const ids = new Set<string>();
  const imageKeys = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new AppError(
        'El manifiesto contiene páginas duplicadas.',
        400,
        'DOCUMENT_PAGE_DUPLICATED'
      );
    }
    ids.add(item.id);

    if (item.kind === 'image') {
      if (imageKeys.has(item.fileKey)) {
        throw new AppError(
          'Una imagen no puede aparecer más de una vez.',
          400,
          'DOCUMENT_FILE_DUPLICATED'
        );
      }
      imageKeys.add(item.fileKey);
    }
  }
};

export const getPdfSourceArtifactIds = (items: DocumentManifestItem[]) => [
  ...new Set(
    items.flatMap(item =>
      item.kind === 'pdfPage' ? [item.sourceArtifactId] : []
    )
  ),
];

export const sanitizePdfName = (value: string) => {
  const withoutExtension = value.replace(/\.pdf$/i, '').trim();
  const normalized = withoutExtension
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _.-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .slice(0, 100)
    .trim();

  if (!normalized) {
    throw new AppError(
      'Ingresa un nombre válido para el PDF.',
      400,
      'DOCUMENT_NAME_INVALID'
    );
  }

  return `${normalized}.pdf`;
};

export const isPdfBuffer = (buffer: Buffer) =>
  buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';

export const isJpegBuffer = (buffer: Buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0xff &&
  buffer[1] === 0xd8 &&
  buffer[2] === 0xff &&
  buffer[buffer.length - 2] === 0xff &&
  buffer[buffer.length - 1] === 0xd9;

export const readJpegDimensions = (buffer: Buffer) => {
  if (!isJpegBuffer(buffer)) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += segmentLength + 2;
  }

  return null;
};

export const validateJpeg = (file: Express.Multer.File) => {
  if (file.size > DOCUMENT_COMPOSER_LIMITS.maxImageBytes) {
    throw new AppError(
      'Una imagen supera el límite de 15 MB.',
      413,
      'DOCUMENT_IMAGE_LIMIT_EXCEEDED'
    );
  }

  const dimensions = readJpegDimensions(file.buffer);
  if (!dimensions) {
    throw new AppError(
      'Uno de los archivos no es una imagen JPEG válida.',
      415,
      'DOCUMENT_IMAGE_INVALID'
    );
  }

  const { width, height } = dimensions;
  const withinDimensions =
    width >= DOCUMENT_COMPOSER_LIMITS.minImageDimension &&
    height >= DOCUMENT_COMPOSER_LIMITS.minImageDimension &&
    width <= DOCUMENT_COMPOSER_LIMITS.maxImageDimension &&
    height <= DOCUMENT_COMPOSER_LIMITS.maxImageDimension &&
    width * height <= DOCUMENT_COMPOSER_LIMITS.maxImagePixels;

  if (!withinDimensions) {
    throw new AppError(
      'Una imagen tiene dimensiones no permitidas.',
      422,
      'DOCUMENT_IMAGE_DIMENSIONS_INVALID'
    );
  }

  return dimensions;
};
