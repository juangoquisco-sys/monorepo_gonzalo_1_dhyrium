import type { Request, Response } from 'express';
import { mkdir, rename, rm } from 'fs/promises';
import path from 'path';

import type { UserType } from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import type { FileMessagePick } from '@/types/types';
import AppError from '@/utils/appError';
import {
  createLiquidationRequestSchema,
  preLiquidationStagesRequestSchema,
  stageLiquidationRequestSchema,
  unamortizedAdvancesRequestSchema,
} from './liquidations.schema';
import LiquidationsService from './liquidations.service';
import { LIQUIDATION_UPLOAD_DIRECTORY } from './liquidations.upload';

const userInfo = (res: Response) => res.locals.userInfo as UserType;

const uploadedFiles = (req: Request) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return Object.values(files ?? {}).flat();
};

const removeFiles = async (filePaths: string[]) => {
  await Promise.all(
    [...new Set(filePaths)].map(filePath => rm(filePath, { force: true }))
  );
};

const persistRequestFiles = async (req: Request, senderId: number) => {
  const fields = req.files as Record<string, Express.Multer.File[]> | undefined;
  const mainFile = fields?.mainProcedure?.[0];
  const attachments = fields?.fileMail ?? [];
  if (!mainFile) {
    throw new AppError(
      'Debe adjuntar el documento principal de la liquidacion.',
      400,
      'LIQUIDATION_MAIN_FILE_REQUIRED'
    );
  }

  const relativeDirectory = `public/mail/${senderId}`;
  const absoluteDirectory = path.join(
    LIQUIDATION_UPLOAD_DIRECTORY,
    String(senderId)
  );
  await mkdir(absoluteDirectory, { recursive: true });
  const attempt = String(Date.now());
  const movedPaths: string[] = [];
  const records: FileMessagePick[] = [];

  for (const file of [mainFile, ...attachments]) {
    const storedName =
      file.fieldname === 'mainProcedure'
        ? `mp_${file.filename}`
        : file.filename;
    const destination = path.join(absoluteDirectory, storedName);
    await rename(file.path, destination);
    movedPaths.push(destination);
    const originalname = [...file.originalname]
      .filter(character => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join('')
      .slice(0, 255);
    records.push({
      name: storedName,
      path: relativeDirectory,
      originalname,
      attempt,
    });
  }

  return { records, movedPaths };
};

class LiquidationsController {
  static async eligibleStages(_req: Request, res: Response) {
    const stages = await LiquidationsService.eligibleStages(userInfo(res).id);
    res.status(200).json(stages);
  }

  static async preLiquidationStages(req: Request, res: Response) {
    const input = preLiquidationStagesRequestSchema.parse({ query: req.query });
    const actor = userInfo(res);
    const stages = await LiquidationsService.preLiquidationStages(actor.id, {
      isModerator: role.accessMenuPoint(
        actor,
        ['MOD'],
        'mis-tareas',
        'tecnicas'
      ),
      ...input.query,
    });
    res.status(200).json(stages);
  }

  static async preLiquidationStageTasks(req: Request, res: Response) {
    const input = stageLiquidationRequestSchema.parse({ params: req.params });
    const actor = userInfo(res);
    const result = await LiquidationsService.preLiquidationStageTasks(
      actor.id,
      input.params.stageId,
      {
        isModerator: role.accessMenuPoint(
          actor,
          ['MOD'],
          'mis-tareas',
          'tecnicas'
        ),
      }
    );
    res.status(200).json(result);
  }

  static async grantStageConformity(req: Request, res: Response) {
    const input = stageLiquidationRequestSchema.parse({ params: req.params });
    const result = await LiquidationsService.grantStageConformity(
      input.params.stageId,
      userInfo(res).id
    );
    res.status(200).json(result);
  }

  static async preview(req: Request, res: Response) {
    const input = stageLiquidationRequestSchema.parse({ params: req.params });
    const result = await LiquidationsService.preview(
      userInfo(res).id,
      input.params.stageId
    );
    res.status(200).json(result);
  }

  static async createRequest(req: Request, res: Response) {
    const temporaryPaths = uploadedFiles(req).map(file => file.path);
    let persistedPaths: string[] = [];
    try {
      const input = createLiquidationRequestSchema.parse({ body: req.body });
      const senderId = userInfo(res).id;
      const persisted = await persistRequestFiles(req, senderId);
      persistedPaths = persisted.movedPaths;
      const result = await LiquidationsService.createRequest({
        ...input.body.data,
        senderId,
        files: persisted.records,
      });
      res.status(201).json(result);
    } catch (error) {
      await removeFiles([...temporaryPaths, ...persistedPaths]);
      throw error;
    }
  }

  static async unamortizedAdvances(req: Request, res: Response) {
    const input = unamortizedAdvancesRequestSchema.parse({
      params: req.params,
    });
    const actor = userInfo(res);
    const advances = await LiquidationsService.unamortizedAdvances({
      actorId: actor.id,
      userId: input.params.userId,
      canManagePayroll: role.accessMenuPoint(
        actor,
        ['MOD'],
        'tramites',
        'planilla'
      ),
    });
    res.status(200).json(advances);
  }
}

export default LiquidationsController;
