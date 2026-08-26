import { ENV } from '@/config/env';
import {
  buildIclockUpsertUserCommand,
  parseIclockAllowedSerials,
} from '@/services/iclock.services';
import { prisma } from '@/utils/prisma.server';
import {
  IclockCommandOperation,
  IclockCommandStatus,
  Prisma,
} from '@prisma/client';

export const getConfiguredIclockSerials = (): string[] =>
  parseIclockAllowedSerials(ENV.ICLOCK_ALLOWED_SERIALS);

export const buildUserCommandRows = ({
  userId,
  pin,
  name,
}: {
  userId: number;
  pin: string;
  name: string;
}): Prisma.IclockDeviceCommandCreateManyInput[] =>
  getConfiguredIclockSerials().map(serialNumber => ({
    serialNumber,
    userId,
    pin,
    name,
    operation: IclockCommandOperation.UPSERT_USER,
    status: IclockCommandStatus.PENDING,
  }));

class IclockCommandService {
  static async leaseNext(serialNumber: string): Promise<string | null> {
    if (!getConfiguredIclockSerials().includes(serialNumber)) return null;

    const now = new Date();
    const leaseExpiresAt = new Date(
      now.getTime() + ENV.ICLOCK_COMMAND_LEASE_SECONDS * 1000
    );

    return prisma.$transaction(
      async tx => {
        const command = await tx.iclockDeviceCommand.findFirst({
          where: {
            serialNumber,
            OR: [
              { status: IclockCommandStatus.PENDING },
              {
                status: IclockCommandStatus.LEASED,
                leaseExpiresAt: { lte: now },
              },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        if (!command) return null;

        const claimed = await tx.iclockDeviceCommand.updateMany({
          where: {
            id: command.id,
            OR: [
              { status: IclockCommandStatus.PENDING },
              {
                status: IclockCommandStatus.LEASED,
                leaseExpiresAt: { lte: now },
              },
            ],
          },
          data: {
            status: IclockCommandStatus.LEASED,
            leasedAt: now,
            leaseExpiresAt,
            attempts: { increment: 1 },
          },
        });

        if (claimed.count !== 1) {
          throw new Error('ICLOCK_COMMAND_ALREADY_LEASED');
        }

        return buildIclockUpsertUserCommand({
          commandId: command.id,
          pin: command.pin,
          name: command.name,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  static async acknowledge({
    serialNumber,
    commandId,
    returnCode,
    rawResult,
  }: {
    serialNumber: string;
    commandId: number;
    returnCode: number;
    rawResult: string;
  }): Promise<'COMPLETED' | 'FAILED' | 'IGNORED'> {
    if (!getConfiguredIclockSerials().includes(serialNumber)) return 'IGNORED';

    const command = await prisma.iclockDeviceCommand.findFirst({
      where: { id: commandId, serialNumber },
      select: { id: true, status: true },
    });
    if (!command) return 'IGNORED';

    const completed = returnCode === 0;
    await prisma.iclockDeviceCommand.update({
      where: { id: command.id },
      data: {
        status: completed
          ? IclockCommandStatus.COMPLETED
          : IclockCommandStatus.FAILED,
        completedAt: new Date(),
        leaseExpiresAt: null,
        returnCode,
        result: rawResult.slice(0, 512),
      },
    });

    return completed ? 'COMPLETED' : 'FAILED';
  }
}

export default IclockCommandService;
