import type { TaskDocumentKind } from './taskDocuments.schema';

export const MAX_INLINE_TASK_DOCUMENT_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_TASK_DOCUMENT_ELEMENTS_TO_INSPECT = 200_000;

const IMAGE_ASSET_EXTENSIONS = new Set([
  'png',
  'jpg',
  'gif',
  'webp',
  'bmp',
  'emf',
  'wmf',
]);
const VIDEO_ASSET_EXTENSIONS = new Set(['mp4', 'webm', 'ogv']);
const INLINE_RASTER_IMAGE_PATTERN =
  /^data:image\/(png|jpeg|gif|webp|bmp);base64,([a-z0-9+/]+={0,2})$/i;
const UUID_V4_ASSET_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|jpg|gif|webp|bmp|emf|wmf|mp4|webm|ogv)$/i;

type CanvasResourceKind = 'image' | 'video';

export type CanvasResourceReferenceFailureReason =
  | 'ELEMENT_LIMIT_EXCEEDED'
  | 'IFRAME_NOT_ALLOWED'
  | 'RESOURCE_VALUE_REQUIRED'
  | 'INLINE_IMAGE_INVALID'
  | 'INLINE_IMAGE_TOO_LARGE'
  | 'RESOURCE_PATH_NOT_ALLOWED'
  | 'RESOURCE_MEDIA_TYPE_MISMATCH';

export type CanvasResourceReferenceValidation =
  | {
      ok: true;
      inspectedElementCount: number;
      resourceCount: number;
    }
  | {
      ok: false;
      reason: CanvasResourceReferenceFailureReason;
      path: string;
      message: string;
    };

interface ValidationContext {
  taskKind: TaskDocumentKind;
  taskId: number;
  apiRoute?: string;
}

interface PendingElement {
  value: unknown;
  path: string;
}

const MAX_REPORTED_RESOURCE_PATH_LENGTH = 512;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizedApiRoute = (value: string | undefined) =>
  (value ?? 'api/v1').replace(/^\/+|\/+$/g, '');

const decodedBase64ByteLength = (value: string) => {
  if (value.length === 0 || value.length % 4 !== 0) return null;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
};

const validateInlineImage = (
  value: string,
  path: string
): CanvasResourceReferenceValidation | null => {
  const match = value.match(INLINE_RASTER_IMAGE_PATTERN);
  if (!match) {
    return {
      ok: false,
      reason: 'INLINE_IMAGE_INVALID',
      path,
      message:
        'La imagen incrustada debe ser PNG, JPEG, GIF, WebP o BMP en base64 valido.',
    };
  }
  const byteLength = decodedBase64ByteLength(match[2]);
  if (byteLength === null) {
    return {
      ok: false,
      reason: 'INLINE_IMAGE_INVALID',
      path,
      message: 'La imagen incrustada contiene base64 invalido.',
    };
  }
  if (byteLength > MAX_INLINE_TASK_DOCUMENT_IMAGE_BYTES) {
    return {
      ok: false,
      reason: 'INLINE_IMAGE_TOO_LARGE',
      path,
      message: 'La imagen incrustada supera el limite de 2 MB.',
    };
  }
  return null;
};

const parseProtectedAssetExtension = (
  value: string,
  context: ValidationContext
) => {
  const route = escapeRegExp(normalizedApiRoute(context.apiRoute));
  const kind = escapeRegExp(context.taskKind);
  const taskId = String(context.taskId);
  const fileName = UUID_V4_ASSET_PATTERN.source.replace(/^\^|\$$/g, '');
  const patterns = [
    new RegExp(
      `^/${route}/task-documents/${kind}/${taskId}/assets/(${fileName})$`,
      'i'
    ),
    new RegExp(`^/task-document-assets/${kind}/${taskId}/(${fileName})$`, 'i'),
    new RegExp(
      `^/uploads/task-documents/${kind}/${taskId}/(${fileName})$`,
      'i'
    ),
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match.at(-1)?.toLowerCase() ?? null;
  }
  return null;
};

const validateResourceValue = (
  value: unknown,
  kind: CanvasResourceKind,
  path: string,
  context: ValidationContext
): CanvasResourceReferenceValidation | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return {
      ok: false,
      reason: 'RESOURCE_VALUE_REQUIRED',
      path,
      message: 'El recurso Canvas requiere una referencia no vacia.',
    };
  }

  if (value.toLowerCase().startsWith('data:')) {
    if (kind !== 'image') {
      return {
        ok: false,
        reason: 'RESOURCE_PATH_NOT_ALLOWED',
        path,
        message: 'Los videos deben usar un recurso protegido de la tarea.',
      };
    }
    return validateInlineImage(value, path);
  }

  const extension = parseProtectedAssetExtension(value, context);
  if (!extension) {
    return {
      ok: false,
      reason: 'RESOURCE_PATH_NOT_ALLOWED',
      path,
      message:
        'El recurso debe pertenecer a la misma tarea y usar una ruta protegida canonica.',
    };
  }

  const extensionAllowed =
    kind === 'image'
      ? IMAGE_ASSET_EXTENSIONS.has(extension)
      : VIDEO_ASSET_EXTENSIONS.has(extension);
  if (!extensionAllowed) {
    return {
      ok: false,
      reason: 'RESOURCE_MEDIA_TYPE_MISMATCH',
      path,
      message: `La extension del recurso no corresponde a un ${kind}.`,
    };
  }
  return null;
};

const appendElementArray = (
  pending: PendingElement[],
  value: unknown,
  path: string
) => {
  if (!Array.isArray(value)) return;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const suffix = `[${index}]`;
    pending.push({
      value: value[index],
      path:
        path.length + suffix.length <= MAX_REPORTED_RESOURCE_PATH_LENGTH
          ? `${path}${suffix}`
          : `${path.slice(0, MAX_REPORTED_RESOURCE_PATH_LENGTH - 3)}...`,
    });
  }
};

const appendNestedElements = (
  pending: PendingElement[],
  element: Record<string, unknown>,
  path: string
) => {
  const childPath = (suffix: string) =>
    path.length + suffix.length <= MAX_REPORTED_RESOURCE_PATH_LENGTH
      ? `${path}${suffix}`
      : `${path.slice(0, MAX_REPORTED_RESOURCE_PATH_LENGTH - 3)}...`;
  appendElementArray(pending, element.valueList, childPath('.valueList'));

  const control = isRecord(element.control) ? element.control : null;
  if (control) {
    appendElementArray(pending, control.value, childPath('.control.value'));
  }

  if (!Array.isArray(element.trList)) return;
  for (let rowIndex = element.trList.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const row = element.trList[rowIndex];
    if (!isRecord(row) || !Array.isArray(row.tdList)) continue;
    for (
      let cellIndex = row.tdList.length - 1;
      cellIndex >= 0;
      cellIndex -= 1
    ) {
      const cell = row.tdList[cellIndex];
      if (!isRecord(cell)) continue;
      appendElementArray(
        pending,
        cell.value,
        childPath(`.trList[${rowIndex}].tdList[${cellIndex}].value`)
      );
    }
  }
};

/**
 * Inspecciona referencias de recursos Canvas sin recursion ni I/O. Los valores
 * de texto, hipervinculos y extensiones opacas no se interpretan como recursos.
 */
export const validateCanvasResourceReferences = (
  contentJson: unknown,
  context: ValidationContext
): CanvasResourceReferenceValidation => {
  if (!isRecord(contentJson) || contentJson.type !== 'canvas-editor') {
    return { ok: true, inspectedElementCount: 0, resourceCount: 0 };
  }
  const data = isRecord(contentJson.data) ? contentJson.data : null;
  if (!data) return { ok: true, inspectedElementCount: 0, resourceCount: 0 };

  const pending: PendingElement[] = [];
  for (const zone of ['graffiti', 'footer', 'main', 'header'] as const) {
    appendElementArray(pending, data[zone], `data.${zone}`);
  }

  let inspectedElementCount = 0;
  let resourceCount = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (!isRecord(current.value)) continue;
    inspectedElementCount += 1;
    if (inspectedElementCount > MAX_TASK_DOCUMENT_ELEMENTS_TO_INSPECT) {
      return {
        ok: false,
        reason: 'ELEMENT_LIMIT_EXCEEDED',
        path: current.path,
        message: 'El documento contiene demasiados elementos para validarlo.',
      };
    }

    if (current.value.type === 'image') {
      resourceCount += 1;
      const failure = validateResourceValue(
        current.value.value,
        'image',
        `${current.path}.value`,
        context
      );
      if (failure) return failure;
    } else if (current.value.type === 'block') {
      const block = isRecord(current.value.block) ? current.value.block : null;
      if (block?.type === 'iframe') {
        return {
          ok: false,
          reason: 'IFRAME_NOT_ALLOWED',
          path: `${current.path}.block`,
          message:
            'Los bloques iframe no estan permitidos en documentos Dhyrium.',
        };
      }
      if (block?.type === 'video') {
        resourceCount += 1;
        const videoBlock = isRecord(block.videoBlock) ? block.videoBlock : null;
        const failure = validateResourceValue(
          videoBlock?.src,
          'video',
          `${current.path}.block.videoBlock.src`,
          context
        );
        if (failure) return failure;
      }
    }

    appendNestedElements(pending, current.value, current.path);
  }

  return { ok: true, inspectedElementCount, resourceCount };
};
