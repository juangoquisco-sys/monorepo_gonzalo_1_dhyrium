import type { Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import {
  closeRankingPeriodParamsSchema,
  createNonTaskActivitySchema,
  createRankingPeriodSchema,
  entryDetailParamsSchema,
  rankingConfigUpdateSchema,
  rankingPeriodQuerySchema,
  reviewNonTaskActivitySchema,
} from './productivityRankings.schema';
import ProductivityRankingsService from './productivityRankings.service';
import ProductivityRankingsPolicy from './productivityRankings.policy';

const userInfo = (res: Response) => res.locals.userInfo as UserType;

class ProductivityRankingsController {
  static async getConfig(_req: Request, res: Response) {
    const config = await ProductivityRankingsService.getConfig();
    res.status(200).json({ config });
  }

  static async updateConfig(req: Request, res: Response) {
    const actor = userInfo(res);
    ProductivityRankingsPolicy.assertModerator(actor);
    const input = rankingConfigUpdateSchema.parse({ body: req.body });
    const config = await ProductivityRankingsService.updateConfig(input.body, actor.id);
    res.status(200).json({ config });
  }

  static async listPeriods(_req: Request, res: Response) {
    const periods = await ProductivityRankingsService.listPeriods();
    res.status(200).json({ periods });
  }

  static async createPeriod(req: Request, res: Response) {
    ProductivityRankingsPolicy.assertModerator(userInfo(res));
    const input = createRankingPeriodSchema.parse({ body: req.body });
    const period = await ProductivityRankingsService.createPeriod(
      input.body.periodStart,
      input.body.periodEnd
    );
    res.status(201).json({ period });
  }

  static async closePeriod(req: Request, res: Response) {
    const actor = userInfo(res);
    ProductivityRankingsPolicy.assertModerator(actor);
    const input = closeRankingPeriodParamsSchema.parse({ params: req.params });
    const period = await ProductivityRankingsService.closePeriod(
      input.params.id,
      actor.id
    );
    res.status(200).json({ period });
  }

  static async top(req: Request, res: Response) {
    const input = rankingPeriodQuerySchema.parse({ query: req.query });
    const result = await ProductivityRankingsService.getTop(input.query.periodId);
    res.status(200).json(result);
  }

  static async officeTop(req: Request, res: Response) {
    const input = rankingPeriodQuerySchema.parse({ query: req.query });
    const result = await ProductivityRankingsService.getOfficeTop(input.query.periodId);
    res.status(200).json(result);
  }

  static async me(req: Request, res: Response) {
    const input = rankingPeriodQuerySchema.parse({ query: req.query });
    const result = await ProductivityRankingsService.getMyEntry(
      userInfo(res).id,
      input.query.periodId
    );
    res.status(200).json(result);
  }

  static async entryDetail(req: Request, res: Response) {
    const actor = userInfo(res);
    const input = entryDetailParamsSchema.parse({ params: req.params, query: req.query });
    const result = await ProductivityRankingsService.getEntryForUser(
      input.params.userId,
      input.query.periodId
    );
    const isSelf = actor.id === input.params.userId;
    const isModerator = ProductivityRankingsPolicy.isModerator(actor);
    const config = await ProductivityRankingsService.getConfig();
    const isPubliclyRankedTop =
      !!result.entry && result.entry.position > 0 && result.entry.position <= config.topN;
    if (!isSelf && !isModerator && !isPubliclyRankedTop) {
      throw new AppError(
        'No tiene permiso para ver el detalle de este usuario.',
        403,
        'PRODUCTIVITY_RANKINGS_ENTRY_FORBIDDEN'
      );
    }
    res.status(200).json(result);
  }

  static async allEntries(req: Request, res: Response) {
    ProductivityRankingsPolicy.assertModerator(userInfo(res));
    const input = rankingPeriodQuerySchema.parse({ query: req.query });
    const result = await ProductivityRankingsService.listAllEntries(input.query.periodId);
    res.status(200).json(result);
  }

  static async createNonTaskActivity(req: Request, res: Response) {
    const input = createNonTaskActivitySchema.parse({ body: req.body });
    const activity = await ProductivityRankingsService.createNonTaskActivity(
      userInfo(res),
      input.body
    );
    res.status(201).json({ activity });
  }

  static async myNonTaskActivities(_req: Request, res: Response) {
    const activities = await ProductivityRankingsService.listMyNonTaskActivities(
      userInfo(res).id
    );
    res.status(200).json({ activities });
  }

  static async pendingNonTaskActivities(_req: Request, res: Response) {
    ProductivityRankingsPolicy.assertModerator(userInfo(res));
    const activities = await ProductivityRankingsService.listPendingNonTaskActivities();
    res.status(200).json({ activities });
  }

  static async reviewNonTaskActivity(req: Request, res: Response) {
    const actor = userInfo(res);
    ProductivityRankingsPolicy.assertModerator(actor);
    const input = reviewNonTaskActivitySchema.parse({
      params: req.params,
      body: req.body,
    });
    const activity = await ProductivityRankingsService.reviewNonTaskActivity(
      input.params.id,
      actor.id,
      input.body
    );
    res.status(200).json({ activity });
  }
}

export default ProductivityRankingsController;
