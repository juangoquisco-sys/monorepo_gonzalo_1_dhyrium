import { Request, Response } from 'express';
import AttendanceCallConfigService from '@/services/attendance/attendanceCallConfig.service';
import {
  callConfigIdParamsSchema,
  resolvedCallsQuerySchema,
  upsertCallConfigRequestSchema,
  upsertWeekdayOverrideRequestSchema,
  weekdayOverrideIdParamsSchema,
} from '@/services/attendance/attendanceCallConfig.schema';

export const listCallConfigs = async (_req: Request, res: Response) => {
  const query = await AttendanceCallConfigService.listCallConfigs();
  res.status(200).json(query);
};

export const upsertCallConfig = async (req: Request, res: Response) => {
  const input = upsertCallConfigRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const query = await AttendanceCallConfigService.upsertCallConfig({
    position: input.params.position,
    ...input.body,
  });
  res.status(200).json(query);
};

export const deleteCallConfig = async (req: Request, res: Response) => {
  const input = callConfigIdParamsSchema.parse({ params: req.params });
  await AttendanceCallConfigService.deleteCallConfig(input.params.id);
  res.status(204).send();
};

export const upsertWeekdayOverride = async (req: Request, res: Response) => {
  const input = upsertWeekdayOverrideRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const query = await AttendanceCallConfigService.upsertWeekdayOverride(
    input.params.id,
    input.params.weekday,
    input.body
  );
  res.status(200).json(query);
};

export const deleteWeekdayOverride = async (req: Request, res: Response) => {
  const input = weekdayOverrideIdParamsSchema.parse({ params: req.params });
  await AttendanceCallConfigService.deleteWeekdayOverride(input.params.id);
  res.status(204).send();
};

export const getResolvedCalls = async (req: Request, res: Response) => {
  const input = resolvedCallsQuerySchema.parse({ query: req.query });
  const date = input.query.date ? new Date(`${input.query.date}T12:00:00Z`) : new Date();
  const query = await AttendanceCallConfigService.resolveCallsForDate(date);
  res.status(200).json(query);
};
