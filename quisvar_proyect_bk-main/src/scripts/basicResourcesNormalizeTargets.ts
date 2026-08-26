import '@/config/env';
import { prisma } from '@/utils/prisma.server';
import {
  normalizeBasicResourceTargets,
  type BasicResourceTargetGraph,
} from '@/modules/basic-resources/basicResources.targets';

const apply = process.argv.includes('--apply');

const targetKey = (target: {
  levelId?: number | null;
  subTaskId?: number | null;
}) => (target.levelId ? `level:${target.levelId}` : `task:${target.subTaskId}`);

async function main() {
  const resources = await prisma.basicResource.findMany({
    include: { targets: true },
    orderBy: { createdAt: 'asc' },
  });
  const graphs = new Map<number, BasicResourceTargetGraph>();
  const redundantTargetIds: string[] = [];

  for (const resource of resources) {
    let graph = graphs.get(resource.stageId);
    if (!graph) {
      const [levels, tasks] = await Promise.all([
        prisma.levels.findMany({
          where: { stagesId: resource.stageId },
          select: { id: true, levelList: true },
        }),
        prisma.subTasks.findMany({
          where: { Levels: { stagesId: resource.stageId } },
          select: { id: true, levels_Id: true },
        }),
      ]);
      graph = {
        levels,
        tasks: tasks.map(task => ({ id: task.id, levelsId: task.levels_Id })),
      };
      graphs.set(resource.stageId, graph);
    }
    const stageGraph = graph;

    const normalized = normalizeBasicResourceTargets(
      resource.targets.map(target => ({
        ...(target.levelId
          ? { levelId: target.levelId }
          : { subTaskId: target.subTaskId! }),
        includeDescendants: target.includeDescendants,
      })),
      stageGraph
    );
    const normalizedKeys = new Set(normalized.map(targetKey));
    redundantTargetIds.push(
      ...resource.targets
        .filter(target => !normalizedKeys.has(targetKey(target)))
        .map(target => target.id)
    );
  }

  if (apply && redundantTargetIds.length) {
    await prisma.basicResourceTarget.deleteMany({
      where: { id: { in: redundantTargetIds } },
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        resourcesReviewed: resources.length,
        redundantTargets: redundantTargetIds.length,
        deletedTargets: apply ? redundantTargetIds.length : 0,
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
