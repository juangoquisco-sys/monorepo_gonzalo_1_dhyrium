import { createHash, randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import AppError from '@/utils/appError';

const PREVIEW_CACHE_DIRECTORY = path.resolve(
  process.cwd(),
  'uploads',
  'task-document-previews'
);
const CONVERSION_TIMEOUT_MS = 120_000;
const pendingConversions = new Map<string, Promise<TaskDocumentPdfPreview>>();

export interface TaskDocumentPdfPreview {
  buffer: Buffer;
  pageCount: number | null;
  cacheKey: string;
}

export const hasDocxZipSignature = (buffer: Buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0x50 &&
  buffer[1] === 0x4b &&
  [0x03, 0x05, 0x07].includes(buffer[2]) &&
  [0x04, 0x06, 0x08].includes(buffer[3]);

export const parsePdfPageCount = (pdfInfoOutput: string) => {
  const match = /^Pages:\s+(\d+)\s*$/im.exec(pdfInfoOutput);
  if (!match) return null;
  const pageCount = Number(match[1]);
  return Number.isSafeInteger(pageCount) && pageCount > 0 ? pageCount : null;
};

const runProcess = (
  executable: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${executable} superó el tiempo máximo permitido.`));
    }, options.timeoutMs ?? CONVERSION_TIMEOUT_MS);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${executable} terminó con código ${code}. ${stderr || stdout}`.trim()
        )
      );
    });
  });

const readPageCount = async (pdfPath: string) => {
  try {
    const { stdout } = await runProcess('pdfinfo', [pdfPath], {
      timeoutMs: 20_000,
    });
    return parsePdfPageCount(stdout);
  } catch (error) {
    console.warn('No se pudo determinar la cantidad de páginas del PDF.', error);
    return null;
  }
};

const persistCachedPdf = async (cachedPdfPath: string, pdf: Buffer) => {
  await fs.mkdir(PREVIEW_CACHE_DIRECTORY, { recursive: true });
  const temporaryCachePath = `${cachedPdfPath}.${randomUUID()}.tmp`;
  await fs.writeFile(temporaryCachePath, pdf);
  await fs.rename(temporaryCachePath, cachedPdfPath);
};

const requestLocalWordRenderer = async (
  input: Express.Multer.File
): Promise<{ buffer: Buffer; pageCount: number | null } | null> => {
  const rendererUrl = process.env.DOCX_RENDERER_URL?.trim();
  if (!rendererUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONVERSION_TIMEOUT_MS);
  try {
    const response = await fetch(rendererUrl, {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Length': String(input.buffer.length),
        'X-Dhyrium-Renderer-Token': process.env.DOCX_RENDERER_TOKEN || '',
        'X-Document-File-Name': encodeURIComponent(input.originalname),
      },
      body: input.buffer,
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`El renderizador Word respondió ${response.status}: ${detail}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error('El renderizador Word no devolvió un PDF válido.');
    }
    const rawPageCount = Number(response.headers.get('x-document-page-count'));
    return {
      buffer,
      pageCount:
        Number.isSafeInteger(rawPageCount) && rawPageCount > 0
          ? rawPageCount
          : null,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const convertAndCache = async (
  input: Express.Multer.File,
  cacheKey: string,
  cachedPdfPath: string
): Promise<TaskDocumentPdfPreview> => {
  try {
    const wordPreview = await requestLocalWordRenderer(input);
    if (wordPreview) {
      await persistCachedPdf(cachedPdfPath, wordPreview.buffer);
      return {
        ...wordPreview,
        cacheKey,
      };
    }
  } catch (error) {
    console.error('Falló el renderizador Word local de alta fidelidad.', error);
    if (process.env.DOCX_RENDERER_REQUIRE_EXACT === 'true') {
      throw new AppError(
        'No se pudo generar la vista fiel mediante Word en esta PC.',
        503,
        'TASK_DOCUMENT_EXACT_RENDERER_UNAVAILABLE'
      );
    }
  }

  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dhyrium-docx-preview-')
  );
  const inputPath = path.join(temporaryDirectory, 'document.docx');
  const generatedPdfPath = path.join(temporaryDirectory, 'document.pdf');
  const profilePath = path.join(temporaryDirectory, `profile-${randomUUID()}`);
  const profileUrl = `file://${profilePath.replace(/\\/g, '/')}`;

  try {
    await fs.writeFile(inputPath, input.buffer);
    await runProcess(
      process.env.LIBREOFFICE_BIN || 'soffice',
      [
        '--headless',
        '--nologo',
        '--nodefault',
        '--nolockcheck',
        '--nofirststartwizard',
        `-env:UserInstallation=${profileUrl}`,
        '--convert-to',
        'pdf:writer_pdf_Export',
        '--outdir',
        temporaryDirectory,
        inputPath,
      ],
      { cwd: temporaryDirectory }
    );

    const generatedPdf = await fs.readFile(generatedPdfPath);
    if (!generatedPdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error('LibreOffice no generó un PDF válido.');
    }

    await persistCachedPdf(cachedPdfPath, generatedPdf);

    return {
      buffer: generatedPdf,
      pageCount: await readPageCount(cachedPdfPath),
      cacheKey,
    };
  } catch (error) {
    console.error('Falló la conversión local de DOCX a PDF.', error);
    throw new AppError(
      'No se pudo generar la vista paginada del documento DOCX.',
      422,
      'TASK_DOCUMENT_PREVIEW_CONVERSION_FAILED'
    );
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
};

class TaskDocumentPreviewService {
  static async createPdfPreview(
    input: Express.Multer.File
  ): Promise<TaskDocumentPdfPreview> {
    if (!hasDocxZipSignature(input.buffer)) {
      throw new AppError(
        'El archivo recibido no contiene un documento DOCX válido.',
        415,
        'TASK_DOCUMENT_PREVIEW_INVALID_DOCX'
      );
    }

    const rendererVersion = process.env.DOCX_RENDERER_URL
      ? 'word-host-v1'
      : 'libreoffice-v1';
    const cacheKey = createHash('sha256')
      .update(rendererVersion)
      .update(input.buffer)
      .digest('hex');
    const cachedPdfPath = path.join(PREVIEW_CACHE_DIRECTORY, `${cacheKey}.pdf`);

    try {
      const cachedPdf = await fs.readFile(cachedPdfPath);
      return {
        buffer: cachedPdf,
        pageCount: await readPageCount(cachedPdfPath),
        cacheKey,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }

    const existingConversion = pendingConversions.get(cacheKey);
    if (existingConversion) return existingConversion;

    const conversion = convertAndCache(input, cacheKey, cachedPdfPath).finally(
      () => pendingConversions.delete(cacheKey)
    );
    pendingConversions.set(cacheKey, conversion);
    return conversion;
  }
}

export default TaskDocumentPreviewService;
