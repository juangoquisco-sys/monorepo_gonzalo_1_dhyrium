import type { IEditorData, IElement } from '@hufe921/canvas-editor';
import { BlockType, ElementType } from '@hufe921/canvas-editor';

const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;
const INLINE_RASTER_IMAGE_PATTERN =
  /^data:image\/(png|jpeg|gif|webp|bmp);base64,([a-z0-9+/]+={0,2})$/i;
const ASSET_FILE_PATTERN =
  '([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\\.(png|jpg|gif|webp|bmp|emf|wmf|mp4|webm|ogv)';
const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'gif',
  'webp',
  'bmp',
  'emf',
  'wmf',
]);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogv']);

export type CanvasResourceKind = 'image' | 'video';

export interface ProtectedCanvasResourceReference {
  type: 'protected';
  canonicalPath: string;
}

export interface InlineCanvasResourceReference {
  type: 'inline';
  value: string;
}

export type CanvasResourceReference =
  | ProtectedCanvasResourceReference
  | InlineCanvasResourceReference;

interface CanvasResourceContext {
  taskKind: 'subtasks' | 'basictasks';
  taskId: number;
  apiRoute?: string;
}

interface MutableResourceSlot {
  kind: CanvasResourceKind;
  value: string;
  assign: (value: string) => void;
}

export class UnsafeCanvasResourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeCanvasResourceError';
  }
}

const decodedBase64ByteLength = (value: string) => {
  if (value.length === 0 || value.length % 4 !== 0) return null;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
};

const resolveInlineImage = (
  value: string
): InlineCanvasResourceReference | null => {
  const match = value.match(INLINE_RASTER_IMAGE_PATTERN);
  if (!match) return null;
  const byteLength = decodedBase64ByteLength(match[2]);
  if (byteLength === null || byteLength > MAX_INLINE_IMAGE_BYTES) return null;
  return { type: 'inline', value };
};

const normalizedApiRoute = (value: string | undefined) =>
  (value ?? 'api/v1').replace(/^\/+|\/+$/g, '');

export const resolveCanvasResourceReference = (
  value: string,
  kind: CanvasResourceKind,
  context: CanvasResourceContext
): CanvasResourceReference | null => {
  if (kind === 'image' && value.toLowerCase().startsWith('data:')) {
    return resolveInlineImage(value);
  }
  if (value.toLowerCase().startsWith('data:')) return null;

  const route = normalizedApiRoute(context.apiRoute).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
  const patterns = [
    new RegExp(
      `^/${route}/task-documents/${context.taskKind}/${context.taskId}/assets/${ASSET_FILE_PATTERN}$`,
      'i'
    ),
    new RegExp(
      `^/task-document-assets/${context.taskKind}/${context.taskId}/${ASSET_FILE_PATTERN}$`,
      'i'
    ),
    new RegExp(
      `^/uploads/task-documents/${context.taskKind}/${context.taskId}/${ASSET_FILE_PATTERN}$`,
      'i'
    ),
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match) continue;
    const fileName = match[1];
    const extension = match[2].toLowerCase();
    const extensionAllowed =
      kind === 'image'
        ? IMAGE_EXTENSIONS.has(extension)
        : VIDEO_EXTENSIONS.has(extension);
    if (!extensionAllowed) return null;
    return {
      type: 'protected',
      canonicalPath: `/${normalizedApiRoute(context.apiRoute)}/task-documents/${
        context.taskKind
      }/${context.taskId}/assets/${fileName}.${extension}`,
    };
  }
  return null;
};

const appendElementArray = (pending: IElement[], value: unknown) => {
  if (!Array.isArray(value)) return;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const element = value[index];
    if (element && typeof element === 'object') {
      pending.push(element as IElement);
    }
  }
};

const collectResourceSlots = (data: IEditorData) => {
  const slots: MutableResourceSlot[] = [];
  const pending: IElement[] = [];
  appendElementArray(pending, data.graffiti);
  appendElementArray(pending, data.footer);
  appendElementArray(pending, data.main);
  appendElementArray(pending, data.header);

  while (pending.length > 0) {
    const element = pending.pop()!;
    if (element.type === ElementType.IMAGE) {
      slots.push({
        kind: 'image',
        value: element.value,
        assign: value => {
          element.value = value;
        },
      });
    } else if (element.type === ElementType.BLOCK) {
      if (element.block?.type === BlockType.IFRAME) {
        throw new UnsafeCanvasResourceError(
          'Los bloques iframe no estan permitidos en documentos Dhyrium.'
        );
      }
      if (element.block?.type === BlockType.VIDEO) {
        const videoBlock = element.block.videoBlock;
        if (!videoBlock) {
          throw new UnsafeCanvasResourceError(
            'El bloque de video no contiene un recurso valido.'
          );
        }
        slots.push({
          kind: 'video',
          value: videoBlock.src,
          assign: value => {
            videoBlock.src = value;
          },
        });
      }
    }

    appendElementArray(pending, element.valueList);
    appendElementArray(pending, element.control?.value);
    element.trList?.forEach(row =>
      row.tdList?.forEach(cell => appendElementArray(pending, cell.value))
    );
  }
  return slots;
};

export const mapCanvasResourceReferences = (
  data: IEditorData,
  transform: (value: string, kind: CanvasResourceKind) => string
) => {
  const result = structuredClone(data);
  const slots = collectResourceSlots(result);
  slots.forEach(slot => slot.assign(transform(slot.value, slot.kind)));
  return result;
};

export const mapCanvasResourceReferencesAsync = async (
  data: IEditorData,
  transform: (value: string, kind: CanvasResourceKind) => Promise<string>
) => {
  const result = structuredClone(data);
  const slots = collectResourceSlots(result);
  const values = await Promise.all(
    slots.map(slot => transform(slot.value, slot.kind))
  );
  slots.forEach((slot, index) => slot.assign(values[index]));
  return result;
};
