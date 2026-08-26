import { Response } from 'express';
import DowloadServices from '@/services/download.services';
import { archiverFolder } from '@/utils/archiver';
import {
  access,
  constants,
  createReadStream,
  readdirSync,
  rmSync,
  statSync,
} from 'fs';
import { ControllerFunction } from '@/types/patterns';
import AppError from '@/utils/appError';
import path from 'path';
import { _parseQueries, parseQueries } from '@/utils/format.server';
import { OptionsMergePdfs } from '@/types/types';
import GenerateFiles from '@/utils/generateFile';
import { v4 as uuidv4 } from 'uuid';
import { ParamsTask } from '@/types/task';
import { spawn } from 'child_process';
import { naturalCompare } from '@/utils/tools';
import { pipeline } from 'stream/promises';

export enum ContentType {
  PlainText = 'text/plain',
  HTML = 'text/html',
  CSS = 'text/css',
  JavaScript = 'text/javascript',
  JSON = 'application/json',
  XML = 'application/xml',
  OctetStream = 'application/octet-stream',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  GIF = 'image/gif',
  MPEG = 'audio/mpeg',
  MP4 = 'video/mp4',
  PDF = 'application/pdf',
}
class DownloadController {
  private type: 'stage' | 'level' = 'level';
  private outPutPath: string = 'download/';
  public downloadLinks: {
    [key: string]: { filePath: string; expiresAt: number };
  } = {};
  private headers(
    res: Response,
    { filename, type }: { filename: string; type: keyof typeof ContentType }
  ) {
    const safeFilename = filename.replace(/[\r\n"\\]/g, '_');
    const list = {
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Type': ContentType[type],
      'File-Name': safeFilename,
    };
    Object.keys(list).forEach(header => {
      res.setHeader(header, list[header as keyof typeof list]);
    });
  }

  constructor(type?: 'stage' | 'level') {
    if (type) {
      this.type = type;
    }
  }

  public firstRoute: ControllerFunction = async (req, res) => {
    const uniqueId = uuidv4();
    const { baseUrl } = req;
    this.downloadLinks[uniqueId] = {
      filePath: 'download/archivito.pdf',
      expiresAt: Date.now() + 1 * 60 * 1000, // Expira en 10 minutos
    };
    // res.json(baseUrl);
    res.redirect(baseUrl + '/redirect/' + uniqueId);
  };

  public redirect: ControllerFunction = async (req, res) => {
    const { uuid } = req.params;
    const downloadEntry = this.downloadLinks[uuid];
    if (!downloadEntry) throw new AppError('error, link invalido', 400);
    if (Date.now() > downloadEntry.expiresAt) {
      delete this.downloadLinks[uuid];
      throw new AppError('error, link expirado', 410);
    }
    const time = downloadEntry.expiresAt - Date.now();
    res.json({
      messsage: 'ruta nueva',
      uuid,
      expires: time / 1000,
    });
  };

  public basicLevel: ControllerFunction = async (req, res, next) => {
    const { id } = req.params;
    const uniqueId = uuidv4();
    const query = parseQueries<ParamsTask>(req.query);
    const sourceDir = this.outPutPath + uniqueId;
    const outputFilePath = sourceDir + '.zip';
    const attributes = {
      sourceDir,
      createFiles: false,
      ...query,
    };
    await DowloadServices.basicLevel(+id, this.type, attributes);
    await archiverFolder(sourceDir, outputFilePath, { removeDir: true });
    access(outputFilePath, constants.F_OK, err => {
      if (err) return next(new AppError('Error Execute', 500));
      const filename = path.basename(outputFilePath);
      const fileStream = createReadStream(outputFilePath);
      this.headers(res, { filename, type: 'OctetStream' });
      fileStream.pipe(res);
      res.on('finish', () => {
        rmSync(outputFilePath);
      });
    });
  };

  public level: ControllerFunction = async (req, res, next) => {
    const { id } = req.params;
    const uniqueId = uuidv4();
    const query = parseQueries<ParamsTask>(req.query);
    const sourceDir = this.outPutPath + uniqueId;
    const outputFilePath = sourceDir + '.zip';
    const attributes = {
      sourceDir,
      createFiles: false,
      ...query,
    };
    await DowloadServices.level(+id, this.type, attributes);
    await archiverFolder(sourceDir, outputFilePath, { removeDir: true });
    access(outputFilePath, constants.F_OK, err => {
      if (err) return next(new AppError('Error Execute', 500));
      const filename = path.basename(outputFilePath);
      const fileStream = createReadStream(outputFilePath);
      this.headers(res, { filename, type: 'OctetStream' });
      fileStream.pipe(res);
      res.on('finish', () => {
        rmSync(outputFilePath);
      });
    });
  };

  public mergePdfLevel: ControllerFunction = async (req, res, next) => {
    const { id } = req.params;
    const query = parseQueries<ParamsTask & OptionsMergePdfs>(req.query);
    const uniqueId = uuidv4();
    const source = this.outPutPath + uniqueId;
    const outputFilePath = source + '_merge.pdf';
    let cleanupExecuted = false;
    let qpdfProcess: ReturnType<typeof spawn> | null = null;

    const cleanup = () => {
      if (cleanupExecuted) return;
      cleanupExecuted = true;

      if (
        qpdfProcess &&
        qpdfProcess.exitCode === null &&
        qpdfProcess.signalCode === null
      ) {
        qpdfProcess.kill();
      }

      try {
        rmSync(source, { recursive: true, force: true });
      } catch (error) {
        console.error('No se pudo limpiar el directorio temporal:', error);
      }

      try {
        rmSync(outputFilePath, { force: true });
      } catch (error) {
        console.error('No se pudo limpiar el PDF temporal:', error);
      }
    };

    const handleConnectionClose = () => {
      if (
        !res.writableFinished &&
        qpdfProcess &&
        qpdfProcess.exitCode === null &&
        qpdfProcess.signalCode === null
      ) {
        qpdfProcess.kill();
      }
    };

    res.once('close', handleConnectionClose);

    try {
      const attributes = { sourceDir: source, ...query };
      const type = this.type;
      const merge = await DowloadServices.mergePdfLevel(+id, type, attributes);
      const { sourceDir } = merge;

      if (res.destroyed) return;

      const paths = readdirSync(sourceDir)
        .filter(file => file.endsWith('.pdf'))
        .sort(naturalCompare)
        .map(file => path.join(sourceDir, file));

      if (paths.length === 0) {
        throw new AppError('No se encontraron archivos PDF para unir.', 404);
      }

      await new Promise<void>((resolve, reject) => {
        let stderr = '';
        let settled = false;
        const finish = (error?: AppError) => {
          if (settled) return;
          settled = true;
          qpdfProcess = null;
          if (error) reject(error);
          else resolve();
        };

        qpdfProcess = spawn(
          'qpdf',
          ['--empty', '--pages', ...paths, '--', outputFilePath],
          {
            shell: false,
            stdio: ['ignore', 'ignore', 'pipe'],
            windowsHide: true,
          }
        );

        qpdfProcess.stderr?.on('data', chunk => {
          if (stderr.length < 8192) {
            stderr += chunk.toString().slice(0, 8192 - stderr.length);
          }
        });

        qpdfProcess.once('error', error => {
          console.error('No se pudo ejecutar qpdf:', error);
          finish(new AppError('No se pudieron unir los archivos PDF.', 500));
        });

        qpdfProcess.once('close', (code, signal) => {
          if (code === 0 || code === 3) {
            if (stderr.trim()) console.warn(stderr.trim());
            finish();
            return;
          }

          console.error('qpdf finalizó con error:', {
            code,
            signal,
            stderr: stderr.trim(),
          });
          finish(new AppError('No se pudieron unir los archivos PDF.', 500));
        });
      });

      if (res.destroyed) return;

      await new Promise<void>((resolve, reject) => {
        access(outputFilePath, constants.F_OK, error => {
          if (error) reject(error);
          else resolve();
        });
      }).catch(() => {
        throw new AppError('No se pudo crear el archivo final.', 500);
      });

      const filename = path.basename(outputFilePath);
      const fileSize = statSync(outputFilePath).size;
      const fileStream = createReadStream(outputFilePath);

      this.headers(res, { filename, type: 'PDF' });
      res.setHeader('Content-Length', fileSize);
      await pipeline(fileStream, res);
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;

      const responseError =
        error instanceof AppError
          ? error
          : new AppError('No se pudo enviar el archivo PDF.', 500);

      if (!res.headersSent) {
        next(responseError);
        return;
      }

      res.destroy(error instanceof Error ? error : undefined);
    } finally {
      res.off('close', handleConnectionClose);
      cleanup();
    }
  };
  public mergePdfBasicLevel: ControllerFunction = async (req, res, next) => {
    const { id } = req.params;
    const query = parseQueries<ParamsTask & OptionsMergePdfs>(req.query);
    const uniqueId = uuidv4();
    const source = this.outPutPath + uniqueId;
    const outputFilePath = source + '_merge.pdf';
    const attributes = { sourceDir: source, ...query };
    const type = this.type;
    const merge = await DowloadServices.mergePdfBasicLevel(
      +id,
      type,
      attributes
    );
    const { sourceDir } = merge;
    const paths = readdirSync(sourceDir).map(path => `${sourceDir}/${path}`);
    await GenerateFiles.merge(paths, outputFilePath);
    access(outputFilePath, constants.F_OK, err => {
      if (err)
        return next(new AppError('No se pudo crear el archivo final.', 500));
      const filename = path.basename(outputFilePath);
      const fileStream = createReadStream(outputFilePath);
      this.headers(res, { filename, type: 'PDF' });
      fileStream.pipe(res);
      res.on('finish', () => {
        const size = statSync(outputFilePath).size / (1024 * 1024);
        console.log(size.toFixed(2), 'total Megabytes');
        rmSync(sourceDir, { recursive: true });
        rmSync(outputFilePath);
      });
    });
  };

  public downloadBySubTask: ControllerFunction = async (req, res, next) => {
    const { id } = req.params;
    const uniqueId = uuidv4();
    const sourceDir = this.outPutPath + uniqueId;
    const outputFilePath = sourceDir + '.zip';
    const attributes = { path: sourceDir };
    await DowloadServices.taskFiles(+id, attributes);
    await archiverFolder(sourceDir, outputFilePath, { removeDir: true });
    access(outputFilePath, constants.F_OK, err => {
      if (err) return next(new AppError('Error Execute', 500));
      const filename = path.basename(outputFilePath);
      const fileStream = createReadStream(outputFilePath);
      this.headers(res, { filename, type: 'OctetStream' });
      fileStream.pipe(res);
      res.on('finish', () => {
        rmSync(outputFilePath);
      });
    });
  };
}

export default DownloadController;
