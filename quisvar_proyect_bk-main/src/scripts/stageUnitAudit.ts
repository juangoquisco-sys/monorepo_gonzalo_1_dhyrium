import 'dotenv/config';
import { prisma } from '../utils/prisma.server';

async function main() {
  const stages = await prisma.stages.findMany({
    select: {
      id: true,
      name: true,
      projectId: true,
      groupId: true,
      project: { select: { name: true, contract: { select: { cui: true } } } },
      projectStageFocus: {
        where: { isCurrent: true, status: { not: 'INACTIVE' } },
        select: {
          unit: { select: { id: true, name: true, codemap: true } },
        },
      },
    },
    orderBy: [{ projectId: 'asc' }, { id: 'asc' }],
  });

  const withUnit = stages.filter(stage => stage.projectStageFocus.length > 0);
  const legacy = stages.filter(stage => stage.projectStageFocus.length === 0);
  const legacyWithGroup = legacy.filter(stage => stage.groupId !== null);
  const legacyWithoutGroup = legacy.filter(stage => stage.groupId === null);

  console.table([
    { category: 'Total de etapas', quantity: stages.length },
    { category: 'Etapas con unidad asignada', quantity: withUnit.length },
    {
      category: 'Etapas aun en compatibilidad por grupo',
      quantity: legacyWithGroup.length,
    },
    {
      category: 'Etapas sin unidad ni grupo',
      quantity: legacyWithoutGroup.length,
    },
  ]);

  if (!legacy.length) return;

  console.log('\nEtapas que requieren revision manual antes de migrar:');
  console.table(
    legacy.map(stage => ({
      stageId: stage.id,
      projectId: stage.projectId,
      cui: stage.project.contract.cui,
      project: stage.project.name,
      stage: stage.name,
      legacyGroupId: stage.groupId,
    }))
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
