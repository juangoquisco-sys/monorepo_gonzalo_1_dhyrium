import '@/config/env';
import AuditLogServices from '@/services/auditLog.services';
import { prisma } from '@/utils/prisma.server';

async function main() {
  const result = await AuditLogServices.cleanupOldLogs();

  console.log(
    JSON.stringify(
      {
        retentionDays: result.retentionDays,
        batchSize: result.batchSize,
        maxBatches: result.maxBatches,
        cutoff: result.cutoff.toISOString(),
        deletedCount: result.deletedCount,
        batches: result.batches,
      },
      null,
      2
    )
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
