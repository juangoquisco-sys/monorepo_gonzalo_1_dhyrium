import '@/config/env';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildCorporateArchiveImportPlan,
  corporateArchiveManifestSha256,
  serializeCorporateArchiveImportPlan,
  type CorporateArchiveImportManifest,
  type CorporateArchiveImportPlan,
  type CorporateArchiveScopeType,
} from '@/modules/corporate-archive/corporateArchiveImport.domain';

type CliOptions = {
  source?: string;
  scopeType?: CorporateArchiveScopeType;
  scopeId?: number;
  actorId?: number;
  apply: boolean;
  manifest?: string;
  expectedManifestSha?: string;
  includeTemporary: boolean;
  resume: boolean;
};

const valueFor = (argumentsList: string[], flag: string) => {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
};

const blockLegacySingleScopeApply = (): void => {
  throw new Error(
    'ARCHIVE_IMPORT_MAPPING_REQUIRED: --apply esta bloqueado hasta aprobar un plan multi-scope que asigne cada ruta a su empresa, consorcio o archivo general. El dry-run no modifica ningun archivo.'
  );
};

export const parseCorporateArchiveImportOptions = (
  argumentsList: string[]
): CliOptions => {
  const scopeType = valueFor(argumentsList, '--scope-type');
  const scopeId = Number(valueFor(argumentsList, '--scope-id'));
  const actorId = Number(valueFor(argumentsList, '--actor-id'));
  if (scopeType !== 'COMPANY' && scopeType !== 'CONSORTIUM') {
    throw new Error('Use --scope-type COMPANY|CONSORTIUM.');
  }
  if (!Number.isSafeInteger(scopeId) || scopeId <= 0) {
    throw new Error('Use --scope-id <entero-positivo>.');
  }
  if (!Number.isSafeInteger(actorId) || actorId <= 0) {
    throw new Error('Use --actor-id <entero-positivo>.');
  }
  const source = valueFor(argumentsList, '--source');
  if (!source) throw new Error('Use --source <carpeta-fuente>.');
  const apply = argumentsList.includes('--apply');
  const manifest = valueFor(argumentsList, '--manifest');
  const expectedManifestSha = valueFor(argumentsList, '--expected-manifest-sha');
  if (apply && (!manifest || !expectedManifestSha)) {
    throw new Error(
      '--apply exige --manifest <plan.json> y --expected-manifest-sha <sha256>.'
    );
  }
  if (argumentsList.includes('--resume') && !apply) {
    throw new Error('--resume solo puede utilizarse junto con --apply.');
  }
  return {
    source,
    scopeType,
    scopeId,
    actorId,
    apply,
    manifest,
    expectedManifestSha,
    includeTemporary: argumentsList.includes('--include-temporary'),
    resume: argumentsList.includes('--resume'),
  };
};

const readManifest = async (filename: string): Promise<CorporateArchiveImportPlan> => {
  const parsed = JSON.parse(await readFile(path.resolve(filename), 'utf8')) as CorporateArchiveImportPlan;
  if (!parsed?.manifest || typeof parsed.manifestSha256 !== 'string') {
    throw new Error('El manifiesto no tiene el formato corporate archive esperado.');
  }
  const computedHash = corporateArchiveManifestSha256(
    parsed.manifest as CorporateArchiveImportManifest
  );
  if (computedHash !== parsed.manifestSha256) {
    throw new Error('El manifiesto fue alterado: su SHA-256 interno no coincide.');
  }
  return parsed;
};

const applyPlan = async (
  plan: CorporateArchiveImportPlan,
  options: Required<Pick<CliOptions, 'actorId' | 'resume'>>
) => {
  /*
   * The persistence service is intentionally loaded at runtime. It is owned by
   * the corporate-archive module and may be deployed independently from this
   * CLI/domain work. This prevents a filesystem import from silently falling
   * back to an untracked copy when the Prisma contract is absent.
   */
  let service: {
    applyCorporateArchiveImport?: (input: {
      manifest: CorporateArchiveImportManifest;
      manifestSha256: string;
      actorId: number;
      resume: boolean;
    }) => Promise<unknown>;
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    service = require('@/modules/corporate-archive/corporateArchiveImport.service');
  } catch {
    throw new Error(
      'El contrato Prisma de corporate-archive aun no esta disponible; apply se bloqueo sin modificar origen ni destino.'
    );
  }
  if (!service.applyCorporateArchiveImport) {
    throw new Error(
      'Falta applyCorporateArchiveImport en el servicio corporate-archive; apply se bloqueo de forma segura.'
    );
  }
  return service.applyCorporateArchiveImport({
    manifest: plan.manifest,
    manifestSha256: plan.manifestSha256,
    actorId: options.actorId,
    resume: options.resume,
  });
};

export async function runCorporateArchiveImport(
  options: CliOptions
): Promise<CorporateArchiveImportPlan | unknown> {
  const scanned = await buildCorporateArchiveImportPlan({
    source: options.source as string,
    scopeType: options.scopeType as CorporateArchiveScopeType,
    scopeId: options.scopeId as number,
    actorId: options.actorId as number,
    includeTemporary: options.includeTemporary,
  });

  if (!options.apply) {
    if (options.manifest) {
      await writeFile(path.resolve(options.manifest), serializeCorporateArchiveImportPlan(scanned), 'utf8');
    }
    return scanned;
  }

  blockLegacySingleScopeApply();
  const suppliedPlan = await readManifest(options.manifest as string);
  if (suppliedPlan.manifestSha256 !== options.expectedManifestSha) {
    throw new Error('El SHA-256 proporcionado no coincide con el manifiesto.');
  }
  if (scanned.manifestSha256 !== suppliedPlan.manifestSha256) {
    throw new Error(
      'La fuente cambio desde el dry-run; genere y apruebe un manifiesto nuevo antes de aplicar.'
    );
  }
  return applyPlan(suppliedPlan, {
    actorId: options.actorId as number,
    resume: options.resume,
  });
}

async function main() {
  const options = parseCorporateArchiveImportOptions(process.argv.slice(2));
  const result = await runCorporateArchiveImport(options);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
