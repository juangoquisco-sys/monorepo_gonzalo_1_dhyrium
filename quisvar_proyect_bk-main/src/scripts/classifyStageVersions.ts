import '@/config/env';
import { prisma } from '@/utils/prisma.server';
import { StageVersionType } from '@prisma/client';
import StageServices from '@/services/stages.services';

/**
 * Clasifica automaticamente el StageVersionType (BASICOS/ESPECIALIDADES/
 * COSTOS/OTRO) de todas las etapas existentes, usando el mismo heuristico
 * por nombre que ya usa el sistema al crear una etapa nueva
 * (StageServices.stageVertionType / inferStageVersionType en
 * meetingUnits.services.ts). Solo toca etapas sin clasificar (sin metadata
 * de version, o con stageType null) — nunca sobreescribe una clasificacion
 * ya hecha a mano desde la pantalla de "Datos generales".
 *
 * Por defecto corre en modo reporte (no escribe nada). Usa --apply para
 * escribir. Pensado para correr primero en desarrollo, revisar el reporte,
 * y luego repetir tal cual (mismo script, otro DATABASE_URL) en produccion.
 */

const apply = process.argv.includes('--apply');

const classifyByName = (name: string): StageVersionType => {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (normalized.includes('basico')) return StageVersionType.BASICOS;
  if (normalized.includes('especial')) return StageVersionType.ESPECIALIDADES;
  if (normalized.includes('costo') || normalized.includes('presupuesto'))
    return StageVersionType.COSTOS;
  return StageVersionType.OTRO;
};

const baseNameFor = (name: string) => name.replace(/\s+v\d+$/i, '').trim() || name;

async function main() {
  console.log(`Modo: ${apply ? 'APLICAR (escribe StageVersionGroup.stageType)' : 'REPORTE (solo lectura)'}`);

  const stages = await prisma.stages.findMany({
    select: {
      id: true,
      name: true,
      projectId: true,
      project: { select: { name: true } },
      versionMetadata: { select: { id: true, groupId: true, group: { select: { stageType: true } } } },
    },
    orderBy: { id: 'asc' },
  });

  let alreadyClassified = 0;
  const toClassify: { id: number; name: string; project: string; suggested: StageVersionType; hadGroup: boolean }[] = [];

  for (const stage of stages) {
    if (stage.versionMetadata?.group.stageType) {
      alreadyClassified++;
      continue;
    }
    toClassify.push({
      id: stage.id,
      name: stage.name,
      project: stage.project.name ?? `#${stage.projectId}`,
      suggested: classifyByName(stage.name),
      hadGroup: !!stage.versionMetadata,
    });
  }

  console.log(`Etapas totales: ${stages.length}`);
  console.log(`Ya clasificadas: ${alreadyClassified}`);
  console.log(`Sin clasificar: ${toClassify.length}`);

  const bySuggested = new Map<StageVersionType, number>();
  toClassify.forEach(s => bySuggested.set(s.suggested, (bySuggested.get(s.suggested) ?? 0) + 1));
  console.log('\nDistribucion sugerida:');
  for (const [type, count] of bySuggested.entries()) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\nDetalle:');
  toClassify.forEach(s =>
    console.log(
      `  [${s.suggested}] "${s.name}" (etapa ${s.id}, proyecto "${s.project}")${s.hadGroup ? '' : ' - sin grupo de version, se creara v1'}`
    )
  );

  if (!apply) {
    console.log('\nModo reporte: no se escribio nada. Vuelve a correr con --apply para aplicar.');
    return;
  }

  console.log('\nAplicando clasificacion...');
  let applied = 0;
  for (const s of toClassify) {
    await StageServices.setVersionType(s.id, s.suggested);
    applied++;
  }
  console.log(`Clasificadas ${applied} etapas.`);
}

main().finally(() => prisma.$disconnect());
