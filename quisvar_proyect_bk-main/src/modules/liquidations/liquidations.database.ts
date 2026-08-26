import { prisma } from '@/utils/prisma.server';

export type LiquidationDatabase = Pick<
  typeof prisma,
  'stages' | 'subTasks' | 'reports' | 'liquidationAdvanceAmortization'
>;

export const asLiquidationDatabase = (client: unknown) =>
  client as LiquidationDatabase;
