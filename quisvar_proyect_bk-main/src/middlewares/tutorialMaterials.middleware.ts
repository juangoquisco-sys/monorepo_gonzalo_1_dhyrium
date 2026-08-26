import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { open, unlink } from 'fs/promises';
import path from 'path';
import multer from 'multer';
import AppError from '@/utils/appError';
import TutorialMaterialsService from '@/services/tutorialMaterials.services';
import {
  resolveTutorialMaterialPath,
  tutorialMaterialsDirectory,
  validateTutorialMaterialContent,
  validateTutorialMaterialMetadata,
  validateTutorialMaterialTotals,
} from '@/services/tutorialMaterials.policy';

const tutorialRoot = path.resolve('public/tutorials');

const requestFiles = (req: Request) => {
  if (!req.files || Array.isArray(req.files)) return req.files || [];
  return Object.values(req.files).flat();
};

const tutorialMaterialFiles = (req: Request) =>
  requestFiles(req).filter(file => file.fieldname === 'docs');

const isPathInsideTutorialRoot = (filePath: string) => {
  const relative = path.relative(tutorialRoot, path.resolve(filePath));
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
};

export const cleanupTutorialRequestFiles = async (req: Request) => {
  await Promise.all(
    requestFiles(req).map(async file => {
      if (!file.path || !isPathInsideTutorialRoot(file.path)) return;
      try {
        await unlink(file.path);
      } catch {
        // The file may already have been removed by a previous validation step.
      }
    })
  );
};

const normalizeUploadError = (error: unknown) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError(
        `El archivo del campo ${
          error.field || 'adjuntos'
        } supera el límite permitido.`,
        400
      );
    }
    if (
      error.code === 'LIMIT_FILE_COUNT' ||
      error.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      return new AppError(
        'Se enviaron más archivos de los permitidos para el tutorial.',
        400
      );
    }
    return new AppError(`No se pudo procesar la carga: ${error.message}`, 400);
  }
  return error;
};

export const withTutorialUploadCleanup =
  (uploadHandler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    uploadHandler(req, res, error => {
      if (error) {
        void cleanupTutorialRequestFiles(req).finally(() =>
          next(normalizeUploadError(error))
        );
        return;
      }

      res.once('finish', () => {
        if (res.statusCode >= 400 && !res.locals.tutorialUploadsCommitted) {
          void cleanupTutorialRequestFiles(req);
        }
      });
      res.once('close', () => {
        if (!res.writableFinished && !res.locals.tutorialUploadsCommitted) {
          void cleanupTutorialRequestFiles(req);
        }
      });
      next();
    });
  };

const readEvidence = async (filePath: string) => {
  const handle = await open(filePath, 'r');
  try {
    const file = await handle.stat();
    const head = Buffer.alloc(Math.min(file.size, 64 * 1024));
    const headResult = await handle.read(head, 0, head.length, 0);
    if (file.size <= headResult.bytesRead) {
      return head.subarray(0, headResult.bytesRead);
    }

    const tailSize = Math.min(file.size - headResult.bytesRead, 256 * 1024);
    const tail = Buffer.alloc(tailSize);
    const tailResult = await handle.read(
      tail,
      0,
      tail.length,
      file.size - tail.length
    );
    return Buffer.concat([
      head.subarray(0, headResult.bytesRead),
      tail.subarray(0, tailResult.bytesRead),
    ]);
  } finally {
    await handle.close();
  }
};

const failValidation = async (
  req: Request,
  next: NextFunction,
  message: string
) => {
  await cleanupTutorialRequestFiles(req);
  next(new AppError(message, 400));
};

export const validateTutorialMaterials =
  (includeExisting: boolean): RequestHandler =>
  async (req: Request, _res: Response, next: NextFunction) => {
    const materials = tutorialMaterialFiles(req);
    if (materials.length === 0) {
      next();
      return;
    }

    try {
      for (const material of materials) {
        const metadataError = validateTutorialMaterialMetadata(material);
        if (metadataError) {
          await failValidation(req, next, metadataError);
          return;
        }

        const resolvedPath = resolveTutorialMaterialPath(material.filename);
        if (
          path.dirname(resolvedPath) !== tutorialMaterialsDirectory() ||
          path.resolve(material.path) !== resolvedPath
        ) {
          await failValidation(
            req,
            next,
            `${material.originalname}: la ruta de almacenamiento no es válida.`
          );
          return;
        }

        const evidence = await readEvidence(resolvedPath);
        const contentError = validateTutorialMaterialContent(
          material,
          evidence
        );
        if (contentError) {
          await failValidation(req, next, contentError);
          return;
        }
      }

      const existingSizes = includeExisting
        ? await TutorialMaterialsService.existingSizes(Number(req.params.id))
        : [];
      const totalsError = validateTutorialMaterialTotals(
        existingSizes,
        materials
      );
      if (totalsError) {
        await failValidation(req, next, totalsError);
        return;
      }

      next();
    } catch (error) {
      await cleanupTutorialRequestFiles(req);
      next(error);
    }
  };
