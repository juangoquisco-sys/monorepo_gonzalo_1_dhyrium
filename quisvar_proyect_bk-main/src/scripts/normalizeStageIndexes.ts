import { prisma } from '../utils/prisma.server';

/**
 * Renumera `index` de niveles (por hermanos: stagesId + rootId) y de tareas
 * (por nivel) de una etapa, conservando el orden actual (index, id).
 *
 * Uso: tsx src/scripts/normalizeStageIndexes.ts <stageId> [--apply]
 * Sin --apply solo muestra los cambios.
 */
async function main() {
  const stageId = Number(process.argv[2]);
  const apply = process.argv.includes('--apply');
  if (!Number.isInteger(stageId) || stageId <= 0) {
    throw new Error('Indica el id de la etapa como primer argumento');
  }

  const levels = await prisma.levels.findMany({
    where: { stagesId: stageId },
    orderBy: [{ index: 'asc' }, { id: 'asc' }],
    select: { id: true, rootId: true, index: true },
  });
  const tasks = await prisma.subTasks.findMany({
    where: { Levels: { stagesId: stageId } },
    orderBy: [{ index: 'asc' }, { id: 'asc' }],
    select: { id: true, levels_Id: true, index: true },
  });

  const plan = (
    rows: { id: number; index: number }[],
    groupOf: (row: any) => number
  ) => {
    const counters = new Map<number, number>();
    return rows.flatMap(row => {
      const key = groupOf(row);
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return row.index === next ? [] : [{ id: row.id, index: next }];
    });
  };

  const levelChanges = plan(levels, row => row.rootId);
  const taskChanges = plan(tasks, row => row.levels_Id);
  console.log(
    `Etapa ${stageId}: ${levelChanges.length}/${levels.length} niveles y ${taskChanges.length}/${tasks.length} tareas por renumerar`
  );
  if (!apply) {
    console.log('Simulación: usa --apply para guardar.');
    return;
  }

  await prisma.$transaction(
    async transaction => {
      await Promise.all([
        ...levelChanges.map(({ id, index }) =>
          transaction.levels.update({ where: { id }, data: { index } })
        ),
        ...taskChanges.map(({ id, index }) =>
          transaction.subTasks.update({ where: { id }, data: { index } })
        ),
      ]);
    },
    { timeout: 120000 }
  );
  console.log('Índices renumerados.');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
