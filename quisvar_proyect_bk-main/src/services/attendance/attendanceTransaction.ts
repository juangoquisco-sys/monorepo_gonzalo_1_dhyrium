import { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';

export type AttendanceTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export const withSerializableAttendanceRetry = async <T>(
  operation: (tx: AttendanceTransactionClient) => Promise<T>,
  retries = 3
): Promise<T> => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await prisma.$transaction(tx => operation(tx), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code);
      if (!retryable) throw error;
      if (attempt === retries) {
        throw new AppError(
          'La asistencia cambio al mismo tiempo. Intente nuevamente',
          409
        );
      }
    }
  }

  throw new AppError('No se pudo completar la operacion de asistencia', 409);
};
