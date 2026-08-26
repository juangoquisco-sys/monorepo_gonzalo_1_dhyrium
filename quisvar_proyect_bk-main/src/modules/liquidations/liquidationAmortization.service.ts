import AppError from '@/utils/appError';
import type { LiquidationDatabase } from './liquidations.database';
import { calculateLiquidationNet } from './liquidations.domain';

export interface ApplySelectedAdvancesCommand {
  liquidationReportId: number;
  userId: number;
  grossLiquidationAmount: number;
  advanceReportIds: number[];
}

export const applySelectedAdvancesInTransaction = async (
  transaction: Pick<
    LiquidationDatabase,
    'reports' | 'liquidationAdvanceAmortization'
  >,
  command: ApplySelectedAdvancesCommand
) => {
  const uniqueAdvanceIds = [...new Set(command.advanceReportIds)];
  const liquidation = await transaction.reports.findUnique({
    where: { id: command.liquidationReportId },
    select: {
      id: true,
      userId: true,
      type: true,
    },
  });

  if (!liquidation || liquidation.type !== 'LIQUIDACION') {
    throw new AppError(
      'Liquidacion no encontrada',
      404,
      'LIQUIDATION_NOT_FOUND'
    );
  }
  if (liquidation.userId !== command.userId) {
    throw new AppError(
      'La liquidacion no pertenece al usuario',
      409,
      'LIQUIDATION_USER_MISMATCH'
    );
  }

  const existingLinks = await transaction.liquidationAdvanceAmortization.count({
    where: { liquidationReportId: liquidation.id },
  });
  if (existingLinks > 0) {
    throw new AppError(
      'La liquidacion ya fue conciliada',
      409,
      'LIQUIDATION_ALREADY_RECONCILED'
    );
  }

  const advances = uniqueAdvanceIds.length
    ? await transaction.reports.findMany({
        where: {
          id: { in: uniqueAdvanceIds },
          userId: command.userId,
          type: 'ADELANTO',
          isAmortized: false,
        },
        select: {
          id: true,
          price: true,
          paymessage: { select: { status: true } },
        },
      })
    : [];

  if (advances.length !== uniqueAdvanceIds.length) {
    throw new AppError(
      'Uno o mas adelantos no existen, pertenecen a otro usuario o ya fueron amortizados.',
      409,
      'INVALID_LIQUIDATION_ADVANCE'
    );
  }

  if (
    advances.some(
      advance =>
        !advance.paymessage ||
        !['PAGADO', 'FINALIZADO'].includes(advance.paymessage.status)
    )
  ) {
    throw new AppError(
      'Solo se pueden amortizar adelantos pagados o finalizados.',
      409,
      'LIQUIDATION_ADVANCE_NOT_PAID'
    );
  }

  const { amortizedAmount, netAmount } = calculateLiquidationNet(
    command.grossLiquidationAmount,
    advances.map(advance => advance.price)
  );
  if (netAmount < 0) {
    throw new AppError(
      'Los adelantos seleccionados superan el monto bruto de la liquidacion.',
      409,
      'LIQUIDATION_NEGATIVE_NET'
    );
  }

  if (advances.length > 0) {
    await transaction.liquidationAdvanceAmortization.createMany({
      data: advances.map(advance => ({
        liquidationReportId: liquidation.id,
        advanceReportId: advance.id,
        amount: advance.price,
      })),
    });
    await transaction.reports.updateMany({
      where: { id: { in: advances.map(advance => advance.id) } },
      data: { isAmortized: true, amortizedAt: new Date() },
    });
  }

  const updatedLiquidation = await transaction.reports.update({
    where: { id: liquidation.id },
    data: {
      subprice: command.grossLiquidationAmount,
      amortizedAmount,
      price: netAmount,
      percentage: 100,
    },
  });

  return {
    liquidation: updatedLiquidation,
    grossAmount: command.grossLiquidationAmount,
    amortizedAmount,
    netAmount,
    consumedAdvanceIds: advances.map(advance => advance.id),
  };
};
