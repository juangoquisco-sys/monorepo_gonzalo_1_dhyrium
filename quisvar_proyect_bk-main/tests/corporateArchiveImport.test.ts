import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildCorporateArchiveImportPlan,
  corporateArchiveCategoryForPath,
  corporateArchiveDeterministicId,
  corporateArchiveManifestSha256,
  isCorporateArchiveTemporaryFile,
  reconcileCorporateArchiveManifest,
} from '@/modules/corporate-archive/corporateArchiveImport.domain';
import { runCorporateArchiveImport } from '@/scripts/importCorporateArchive';
import { applyCorporateArchiveImport } from '@/modules/corporate-archive/corporateArchiveImport.service';

const withTemporarySource = async (
  run: (source: string) => Promise<void>
) => {
  const source = await mkdtemp(path.join(os.tmpdir(), 'corporate-archive-'));
  try {
    await mkdir(path.join(source, 'COORPORACION DHYRIUM G', '2 ACTAS DE COORDINACI\u00d3N'), {
      recursive: true,
    });
    await mkdir(path.join(source, 'COORPORACION DHYRIUM G', '8 OSCE', 'VACIA'), {
      recursive: true,
    });
    await writeFile(
      path.join(source, 'COORPORACION DHYRIUM G', '2 ACTAS DE COORDINACI\u00d3N', 'acta.pdf'),
      '%PDF-1.7\ncontenido'
    );
    await writeFile(
      path.join(source, 'COORPORACION DHYRIUM G', '2 ACTAS DE COORDINACI\u00d3N', '~$.acta.docx'),
      'bloqueo'
    );
    await run(source);
  } finally {
    await rm(source, { recursive: true, force: true });
  }
};

test('builds a stable manifest with empty directories and temporary-file protection', async () => {
  await withTemporarySource(async source => {
    const input = {
      source,
      scopeType: 'COMPANY' as const,
      scopeId: 44,
      actorId: 9,
    };
    const first = await buildCorporateArchiveImportPlan(input);
    const second = await buildCorporateArchiveImportPlan(input);
    assert.equal(first.manifest.summary.directories, 4);
    assert.equal(first.manifest.summary.files, 2);
    assert.equal(first.manifest.summary.readyFiles, 1);
    assert.equal(first.manifest.summary.skippedTemporaryFiles, 1);
    assert.equal(first.manifestSha256, second.manifestSha256);
    assert.ok(
      first.manifest.folders.some(
        folder => folder.sourceDirectory.endsWith('8 OSCE/VACIA')
      )
    );
    const managementFolder = first.manifest.folders.find(folder =>
      folder.sourceDirectory.endsWith('2 ACTAS DE COORDINACI\u00d3N')
    );
    assert.equal(
      managementFolder?.parentTargetFolderRef,
      first.manifest.categoryRoots.MANAGEMENT.rootFolderRef
    );
    assert.notEqual(
      first.manifest.categoryRoots.IDENTITY.rootFolderRef,
      first.manifest.categoryRoots.MANAGEMENT.rootFolderRef
    );
    const temporary = first.manifest.files.find(file => file.originalName.startsWith('~$'));
    assert.equal(temporary?.status, 'SKIPPED_TEMPORARY');
    assert.equal(temporary?.sha256.length, 64);
    assert.equal(
      first.manifest.files.find(file => file.originalName === 'acta.pdf')?.mimeType,
      'application/pdf'
    );
    const includingTemporary = await buildCorporateArchiveImportPlan({
      ...input,
      includeTemporary: true,
    });
    assert.equal(includingTemporary.manifest.summary.readyFiles, 2);
    assert.equal(includingTemporary.manifest.summary.skippedTemporaryFiles, 0);
  });
});

test('maps agreed categories and deterministic UUID refs', () => {
  assert.equal(
    corporateArchiveCategoryForPath('COORPORACION DHYRIUM G/2 ACTAS DE COORDINACI\u00d3N'),
    'MANAGEMENT'
  );
  assert.equal(
    corporateArchiveCategoryForPath('COORPORACION DHYRIUM G/10 DOCUMENTOS DE CERTIFICACI\u00d3N'),
    'COMPLIANCE'
  );
  assert.equal(
    corporateArchiveCategoryForPath('COORPORACION DHYRIUM EM/01 ART'),
    'EXPERIENCE'
  );
  assert.equal(isCorporateArchiveTemporaryFile('~WRL0003.tmp'), true);
  assert.equal(isCorporateArchiveTemporaryFile('acta.tmp'), false);
  assert.equal(
    corporateArchiveDeterministicId('folder:A'),
    corporateArchiveDeterministicId('folder:A')
  );
  assert.match(corporateArchiveDeterministicId('folder:A'), /^[\da-f-]{36}$/);
});

test('reconciles missing, changed and unexpected entries without persistence', async () => {
  await withTemporarySource(async source => {
    const plan = await buildCorporateArchiveImportPlan({
      source,
      scopeType: 'CONSORTIUM',
      scopeId: 77,
      actorId: 11,
    });
    assert.equal(plan.manifestSha256, corporateArchiveManifestSha256(plan.manifest));
    const result = reconcileCorporateArchiveManifest(plan.manifest, {
      folders: [plan.manifest.folders[0].sourceDirectory, 'ORFANA'],
      files: [
        { sourceFile: plan.manifest.files[0].sourceFile, sha256: 'different' },
        { sourceFile: 'ORFANO.pdf', sha256: 'same' },
      ],
    });
    assert.equal(result.missingFolders.length, plan.manifest.folders.length - 1);
    assert.equal(result.changedFiles.length, 1);
    assert.deepEqual(result.unexpectedFolders, ['ORFANA']);
    assert.deepEqual(result.unexpectedFiles, ['ORFANO.pdf']);
  });
});

test('rejects a reparse point instead of traversing it', async t => {
  if (process.platform === 'win32') {
    t.skip('Crear symlinks requiere privilegio de Windows en este entorno.');
    return;
  }
  const source = await mkdtemp(path.join(os.tmpdir(), 'corporate-archive-link-'));
  try {
    const target = path.join(source, 'target');
    await mkdir(target);
    await symlink(target, path.join(source, 'link'));
    await assert.rejects(
      () =>
        buildCorporateArchiveImportPlan({
          source,
          scopeType: 'COMPANY',
          scopeId: 1,
          actorId: 1,
        }),
      /Reparse point rechazado/
    );
  } finally {
    await rm(source, { recursive: true, force: true });
  }
});

test('blocks legacy single-scope apply before changing persistence', async () => {
  await withTemporarySource(async source => {
    const plan = await buildCorporateArchiveImportPlan({
      source,
      scopeType: 'COMPANY',
      scopeId: 1,
      actorId: 1,
    });
    await assert.rejects(
      () => applyCorporateArchiveImport({
        manifest: plan.manifest,
        manifestSha256: plan.manifestSha256,
        actorId: 1,
        resume: false,
      }),
      (error: unknown) =>
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ARCHIVE_IMPORT_MAPPING_REQUIRED'
    );
    await assert.rejects(
      () => runCorporateArchiveImport({
        source,
        scopeType: 'COMPANY',
        scopeId: 1,
        actorId: 1,
        apply: true,
        manifest: path.join(source, 'unused-plan.json'),
        expectedManifestSha: '0'.repeat(64),
        includeTemporary: false,
        resume: false,
      }),
      /ARCHIVE_IMPORT_MAPPING_REQUIRED/
    );
  });
});
