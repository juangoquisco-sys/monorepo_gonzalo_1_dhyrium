import '@/config/env';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/utils/prisma.server';

/**
 * Sugiere (y, con --apply, escribe) el peso en dias (SubTasks.days) de
 * tareas que hoy estan en 0, a partir del historial de tareas ya resueltas:
 *
 * - Tareas "parametrizadas" (Bloque X, Corte X, Detalles de X, ...): una
 *   misma tarea fisica no repite nombre entre proyectos (cada colegio tiene
 *   sus propios bloques), asi que se usa la MEDIANA historica de esa misma
 *   CATEGORIA de tarea (todas las "BLOQUE ..." de todos los proyectos).
 * - Tareas "genericas" (checklist que se repite igual entre proyectos): se
 *   usa la MEDIANA historica de esa misma tarea POR NOMBRE EXACTO.
 *
 * El corpus de referencia se separa por "familia de etapa" (Especialidades
 * vs Basicos/otros) porque la misma tarea puede pesar distinto segun la
 * fase del proyecto en la que se encuentre.
 *
 * Por defecto corre en modo reporte (no escribe nada): genera un CSV con
 * la sugerencia por tarea para revision humana. Pasa --apply para escribir
 * SubTasks.days en las tareas que tengan sugerencia. Usa --project-ids=54,59
 * para limitar el alcance (recomendado la primera vez).
 */

const apply = process.argv.includes('--apply');
const projectIdsArg = process.argv
  .find(arg => arg.startsWith('--project-ids='))
  ?.split('=')[1];
const targetProjectIds = projectIdsArg
  ? projectIdsArg.split(',').map(id => Number(id.trim())).filter(Number.isFinite)
  : null;

const MIN_GENERIC_SAMPLE = 2;
const MIN_PATTERN_SAMPLE = 5;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const normalizeTaskName = (name: string) =>
  stripAccents(name)
    .trim()
    .toUpperCase()
    .replace(/^PC\s*-\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

const PARAMETRIZED_PATTERN =
  /^(BLOQUE|BOQUE|CORTE|DETALLES? DE|MODULO|AMBIENTE|PABELLON)\b/;

const parametrizedCategory = (normalizedName: string): string | null => {
  const match = normalizedName.match(PARAMETRIZED_PATTERN);
  if (!match) return null;
  return match[1].replace('BOQUE', 'BLOQUE');
};

const stageFamily = (stageName: string): 'ESPECIALIDADES' | 'OTRO' =>
  stripAccents(stageName).toUpperCase().includes('ESPECIALIDAD')
    ? 'ESPECIALIDADES'
    : 'OTRO';

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

interface SourceRow {
  name: string;
  days: number;
  stageName: string;
}

interface TargetRow {
  id: number;
  name: string;
  days: number;
  stageName: string;
  projectName: string;
  levelIndex: number;
}

async function main() {
  console.log(`Modo: ${apply ? 'APLICAR (escribe SubTasks.days)' : 'REPORTE (solo lectura)'}`);
  if (targetProjectIds) console.log(`Alcance: proyectos ${targetProjectIds.join(', ')}`);

  const allTasks = await prisma.subTasks.findMany({
    select: {
      id: true,
      name: true,
      days: true,
      index: true,
      Levels: {
        select: {
          stages: {
            select: {
              name: true,
              project: { select: { id: true, name: true } },
              versionMetadata: { select: { isCurrent: true } },
            },
          },
        },
      },
    },
  });

  const sourceRows: SourceRow[] = [];
  const targetRows: TargetRow[] = [];
  let skippedSupersededStages = 0;
  for (const task of allTasks) {
    // Una etapa re-subida como version mas nueva deja la anterior "vieja":
    // ni sirve de referencia ni tiene sentido sugerirle peso, porque esas
    // tareas ya no cuentan para el ranking (ver productivityRankings.service.ts).
    if (task.Levels.stages.versionMetadata?.isCurrent === false) {
      skippedSupersededStages++;
      continue;
    }
    const stageName = task.Levels.stages.name;
    const projectId = task.Levels.stages.project.id;
    if (task.days > 0) {
      sourceRows.push({ name: task.name, days: task.days, stageName });
    } else if (!targetProjectIds || targetProjectIds.includes(projectId)) {
      targetRows.push({
        id: task.id,
        name: task.name,
        days: task.days,
        stageName,
        projectName: task.Levels.stages.project.name ?? `#${projectId}`,
        levelIndex: task.index,
      });
    }
  }

  // Corpus generico: (familia de etapa, nombre normalizado) -> [days...]
  const genericCorpus = new Map<string, number[]>();
  // Corpus parametrizado: (familia de etapa, categoria) -> [days...]
  const patternCorpus = new Map<string, number[]>();

  for (const row of sourceRows) {
    const family = stageFamily(row.stageName);
    const normalized = normalizeTaskName(row.name);
    const category = parametrizedCategory(normalized);
    if (category) {
      const key = `${family}::${category}`;
      const bucket = patternCorpus.get(key) ?? [];
      bucket.push(row.days);
      patternCorpus.set(key, bucket);
    } else {
      const key = `${family}::${normalized}`;
      const bucket = genericCorpus.get(key) ?? [];
      bucket.push(row.days);
      genericCorpus.set(key, bucket);
    }
  }

  interface Suggestion {
    task: TargetRow;
    suggestedDays: number | null;
    source: 'exact-match' | 'pattern-average' | 'none';
    sampleSize: number;
  }

  const suggestions: Suggestion[] = targetRows.map(task => {
    const family = stageFamily(task.stageName);
    const normalized = normalizeTaskName(task.name);
    const category = parametrizedCategory(normalized);

    if (category) {
      const key = `${family}::${category}`;
      const bucket = patternCorpus.get(key) ?? [];
      if (bucket.length >= MIN_PATTERN_SAMPLE) {
        return {
          task,
          suggestedDays: Math.round(median(bucket) * 100) / 100,
          source: 'pattern-average',
          sampleSize: bucket.length,
        };
      }
    } else {
      const key = `${family}::${normalized}`;
      const bucket = genericCorpus.get(key) ?? [];
      if (bucket.length >= MIN_GENERIC_SAMPLE) {
        return {
          task,
          suggestedDays: Math.round(median(bucket) * 100) / 100,
          source: 'exact-match',
          sampleSize: bucket.length,
        };
      }
    }
    return { task, suggestedDays: null, source: 'none', sampleSize: 0 };
  });

  const resolved = suggestions.filter(s => s.suggestedDays !== null);
  const bySource = {
    'exact-match': resolved.filter(s => s.source === 'exact-match').length,
    'pattern-average': resolved.filter(s => s.source === 'pattern-average').length,
    none: suggestions.length - resolved.length,
  };

  console.log(`\nTareas de etapas superadas por una version mas nueva (ignoradas): ${skippedSupersededStages}`);
  console.log(`Tareas sin peso evaluadas: ${suggestions.length}`);
  console.log(`  Resueltas por nombre exacto (checklist generico): ${bySource['exact-match']}`);
  console.log(`  Resueltas por categoria (elementos propios del edificio): ${bySource['pattern-average']}`);
  console.log(`  Sin sugerencia (requieren revision manual / IA): ${bySource.none}`);

  const reportDir = path.resolve(__dirname, '../../reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'task-weight-suggestions.csv');
  const csvLines = [
    'taskId,projectName,stageName,taskName,currentDays,suggestedDays,source,sampleSize',
    ...suggestions.map(s =>
      [
        s.task.id,
        `"${s.task.projectName.replace(/"/g, '""')}"`,
        `"${s.task.stageName.replace(/"/g, '""')}"`,
        `"${s.task.name.replace(/"/g, '""')}"`,
        s.task.days,
        s.suggestedDays ?? '',
        s.source,
        s.sampleSize,
      ].join(',')
    ),
  ];
  await writeFile(reportPath, csvLines.join('\n'), 'utf-8');
  console.log(`\nReporte escrito en: ${reportPath}`);

  if (apply) {
    console.log('\nAplicando sugerencias a SubTasks.days...');
    let updated = 0;
    for (const s of resolved) {
      await prisma.subTasks.update({
        where: { id: s.task.id },
        data: { days: s.suggestedDays! },
      });
      updated++;
    }
    console.log(`Actualizadas ${updated} tareas.`);
  } else {
    console.log('\nModo reporte: no se escribio nada. Revisa el CSV y vuelve a correr con --apply.');
  }
}

main().finally(() => prisma.$disconnect());
