import type { Response } from 'express';
import { LunchMenuSelectionSource } from '@prisma/client';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import {
  assignLunchMenuRequestSchema,
  assignMostRequestedLunchMenuRequestSchema,
  lunchMenuServiceDateParamsSchema,
  publishLunchMenuRequestSchema,
  reopenLunchMenuRequestSchema,
  selectOwnLunchMenuRequestSchema,
} from './lunchMenu.schema';
import LunchMenuService from './lunchMenu.service';

const getUser = (res: Response) => res.locals.userInfo as UserType;
const toDate = (value: string) => new Date(`${value}T00:00:00`);

class LunchMenuController {
  static async current(req: import('express').Request, res: Response) {
    const result = await LunchMenuService.getCurrentForUser(getUser(res).id);
    res.status(200).json(result);
  }

  static async publish(req: import('express').Request, res: Response) {
    const input = publishLunchMenuRequestSchema.parse({ body: req.body });
    const result = await LunchMenuService.publish({
      ...input.body,
      serviceDate: toDate(input.body.serviceDate),
      createdById: getUser(res).id,
    });
    res.status(201).json(result);
  }

  static async close(req: import('express').Request, res: Response) {
    const params = lunchMenuServiceDateParamsSchema.parse(req.params);
    const result = await LunchMenuService.close(
      toDate(params.serviceDate),
      getUser(res).id
    );
    res.status(200).json(result);
  }

  static async reopen(req: import('express').Request, res: Response) {
    const input = reopenLunchMenuRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await LunchMenuService.reopen(
      toDate(input.params.serviceDate),
      getUser(res).id,
      input.body.durationMinutes
    );
    res.status(200).json(result);
  }

  static async getOwn(req: import('express').Request, res: Response) {
    const params = lunchMenuServiceDateParamsSchema.parse(req.params);
    const result = await LunchMenuService.getForUser(
      toDate(params.serviceDate),
      getUser(res).id
    );
    res.status(200).json(result);
  }

  static async selectOwn(req: import('express').Request, res: Response) {
    const input = selectOwnLunchMenuRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const user = getUser(res);
    const result = await LunchMenuService.select({
      ...input.body,
      serviceDate: toDate(input.params.serviceDate),
      userId: user.id,
      actorId: user.id,
      source: LunchMenuSelectionSource.SELF,
    });
    res.status(200).json(result);
  }

  static async assignPending(req: import('express').Request, res: Response) {
    const input = assignLunchMenuRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const user = getUser(res);
    const result = await LunchMenuService.select({
      ...input.body,
      serviceDate: toDate(input.params.serviceDate),
      userId: input.params.userId,
      actorId: user.id,
      actorDni: user.profile.dni,
      source: LunchMenuSelectionSource.ADMIN,
    });
    res.status(200).json(result);
  }

  static async assignMostRequestedPending(
    req: import('express').Request,
    res: Response
  ) {
    const input = assignMostRequestedLunchMenuRequestSchema.parse({
      params: req.params,
      body: req.body ?? {},
    });
    const user = getUser(res);
    const result = await LunchMenuService.assignMostRequestedToPending(
      toDate(input.params.serviceDate),
      user.id,
      user.profile.dni,
      input.body.assignments
    );
    res.status(200).json(result);
  }

  static async previewMostRequestedPending(
    req: import('express').Request,
    res: Response
  ) {
    const params = lunchMenuServiceDateParamsSchema.parse(req.params);
    const user = getUser(res);
    const result = await LunchMenuService.previewMostRequestedPending(
      toDate(params.serviceDate),
      user.profile.dni
    );
    res.status(200).json(result);
  }

  static async moderation(req: import('express').Request, res: Response) {
    const params = lunchMenuServiceDateParamsSchema.parse(req.params);
    try {
      const result = await LunchMenuService.getModeration(toDate(params.serviceDate));
      res.status(200).json({ exists: true, ...result });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        res.status(200).json({ exists: false, serviceDate: params.serviceDate });
        return;
      }
      throw error;
    }
  }

  static async consolidated(req: import('express').Request, res: Response) {
    const params = lunchMenuServiceDateParamsSchema.parse(req.params);
    try {
      const result = await LunchMenuService.getConsolidated(toDate(params.serviceDate));
      res.status(200).json({ exists: true, ...result });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        res.status(200).json({ exists: false, serviceDate: params.serviceDate });
        return;
      }
      throw error;
    }
  }
}

export default LunchMenuController;
