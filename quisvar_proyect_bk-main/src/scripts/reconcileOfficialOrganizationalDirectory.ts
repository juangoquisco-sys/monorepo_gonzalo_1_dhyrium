import '@/config/env';
import { prisma } from '@/utils/prisma.server';
import {
  buildOfficialDirectoryReconciliationPlan,
  type DirectoryReconciliationPlan,
  type ReconciliationUnitSnapshot,
} from '@/services/orgDirectoryReconciliation.domain';
import {
  validateReconciliationExecutionRequest,
  type ReconciliationExecutionMode,
} from '@/services/orgDirectoryReconciliationSafety.domain';

const SNAPSHOT_SELECT = {
  id: true,
  name: true,
  codemap: true,
  type: true,
  parentId: true,
  isActive: true,
  legacyMap: {
    select: {
      legacyType: true,
      legacyId: true,
    },
  },
} as const;

async function readSnapshot(): Promise<ReconciliationUnitSnapshot[]> {
  return prisma.organizationalUnit.findMany({ select: SNAPSHOT_SELECT });
}

function summarize(
  plan: DirectoryReconciliationPlan,
  mode: ReconciliationExecutionMode['mode']
) {
  return {
    mode,
    totals: {
      create: plan.actions.filter(action => action.operation === 'CREATE').length,
      update: plan.actions.filter(action => action.operation === 'UPDATE').length,
      unchanged: plan.actions.filter(action => action.operation === 'UNCHANGED').length,
    },
    blockers: plan.blockers,
    actions: plan.actions,
  };
}

export async function reconcileOfficialOrganizationalDirectory(
  execution: ReconciliationExecutionMode = { mode: 'dry-run' }
) {
  const plan = buildOfficialDirectoryReconciliationPlan(await readSnapshot());
  if (execution.mode === 'dry-run') return summarize(plan, 'dry-run');

  if (plan.blockers.length) {
    throw new Error(
      `No se modificó la base porque existen bloqueos:\n- ${plan.blockers.join('\n- ')}`
    );
  }

  await prisma.$transaction(async tx => {
    const unitIdByKey = new Map(
      plan.actions.flatMap(action =>
        action.unitId ? ([[action.directoryKey, action.unitId]] as const) : []
      )
    );

    for (const action of plan.actions) {
      const parentId = action.parentDirectoryKey
        ? unitIdByKey.get(action.parentDirectoryKey)
        : null;
      if (action.parentDirectoryKey && !parentId) {
        throw new Error(
          `No se pudo resolver el padre ${action.parentDirectoryKey} de ${action.directoryKey}.`
        );
      }

      if (action.unitId) {
        if (action.operation === 'UNCHANGED') continue;
        await tx.organizationalUnit.update({
          where: { id: action.unitId },
          data: {
            name: action.name,
            codemap: action.codemap,
            type: action.type,
            parentId,
            isActive: true,
          },
          select: { id: true },
        });
        unitIdByKey.set(action.directoryKey, action.unitId);
        continue;
      }

      const created = await tx.organizationalUnit.create({
        data: {
          name: action.name,
          codemap: action.codemap,
          type: action.type,
          parentId,
          isActive: true,
        },
        select: { id: true },
      });
      unitIdByKey.set(action.directoryKey, created.id);
    }
  });

  const result = buildOfficialDirectoryReconciliationPlan(await readSnapshot());
  if (result.blockers.length || result.actions.some(action => action.operation !== 'UNCHANGED')) {
    throw new Error('La verificación posterior no confirmó un directorio idempotente.');
  }
  return {
    ...summarize(plan, execution.mode),
    verification: 'IDEMPOTENT',
  };
}

async function main() {
  const execution = validateReconciliationExecutionRequest(
    process.argv.slice(2),
    process.env.DATABASE_URL
  );
  console.log(
    JSON.stringify(
      await reconcileOfficialOrganizationalDirectory(execution),
      null,
      2
    )
  );
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
