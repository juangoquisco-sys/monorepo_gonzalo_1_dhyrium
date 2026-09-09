import type { Response } from 'express';
import ExpedienteFoliationService from './expedienteFoliation.service';
import {
  generateExpedienteFoliationRequestSchema,
  getExpedienteFoliationRequestSchema,
  reprintExpedienteFoliationRequestSchema,
} from './expedienteFoliation.schema';
import type { ControllerFunction } from '@/types/patterns';

const getUserId = (res: Response) => res.locals.userInfo.id as number;

class ExpedienteFoliationController {
  static generate: ControllerFunction = async (req, res) => {
    const input = generateExpedienteFoliationRequestSchema.parse({
      params: req.params,
      query: req.query,
    });
    const foliation = await ExpedienteFoliationService.generate({
      actorId: getUserId(res),
      rootId: input.params.id,
      rootType: input.params.rootType,
      ...input.query,
    });
    res.status(201).json({ foliation });
  };

  static status: ControllerFunction = async (req, res) => {
    const input = getExpedienteFoliationRequestSchema.parse({
      params: req.params,
    });
    const foliation = await ExpedienteFoliationService.getStatus(
      input.params.id,
      input.params.rootType
    );
    res.status(200).json({ foliation });
  };

  static download: ControllerFunction = async (req, res) => {
    const input = getExpedienteFoliationRequestSchema.parse({
      params: req.params,
    });
    const { absolutePath, fileName } = await ExpedienteFoliationService.getDownload(
      input.params.id,
      input.params.rootType
    );
    res.download(absolutePath, fileName);
  };

  static reprint: ControllerFunction = async (req, res) => {
    const input = reprintExpedienteFoliationRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const { buffer, fileName } = await ExpedienteFoliationService.reprint({
      actorId: getUserId(res),
      rootId: input.params.id,
      rootType: input.params.rootType,
      selection: input.body,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName.replace(/[\r\n"\\]/g, '_')}"`
    );
    res.status(200).send(buffer);
  };
}

export default ExpedienteFoliationController;
