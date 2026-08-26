import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPdfSourceArtifactIds,
  parseDocumentManifest,
  readJpegDimensions,
  sanitizePdfName,
} from '@/modules/document-composer/documentComposer.domain';
import {
  buildQpdfExtractArgs,
  buildQpdfMergeArgs,
} from '@/modules/document-composer/qpdf.service';

test('accepts and preserves a continuous explicit page order', () => {
  const manifest = parseDocumentManifest({
    version: 1,
    items: [
      { id: 'page-b', kind: 'image', fileKey: 'b.jpg', order: 2 },
      { id: 'page-a', kind: 'image', fileKey: 'a.jpg', order: 1 },
    ],
  });

  assert.deepEqual(
    manifest.items.map(item => item.order),
    [2, 1]
  );
});

test('accepts multiple PDF sources and returns each artifact once', () => {
  const firstSource = '11111111-1111-4111-8111-111111111111';
  const secondSource = '22222222-2222-4222-8222-222222222222';
  const manifest = parseDocumentManifest({
    version: 1,
    items: [
      {
        id: 'first-page',
        kind: 'pdfPage',
        sourceArtifactId: firstSource,
        pageNumber: 1,
        order: 1,
      },
      {
        id: 'scan',
        kind: 'image',
        fileKey: 'scan.jpg',
        order: 2,
      },
      {
        id: 'second-page',
        kind: 'pdfPage',
        sourceArtifactId: secondSource,
        pageNumber: 3,
        order: 3,
      },
      {
        id: 'first-page-again',
        kind: 'pdfPage',
        sourceArtifactId: firstSource,
        pageNumber: 2,
        order: 4,
      },
    ],
  });

  assert.deepEqual(getPdfSourceArtifactIds(manifest.items), [
    firstSource,
    secondSource,
  ]);
});

test('rejects gaps, duplicate ids and duplicate image keys', () => {
  assert.throws(
    () =>
      parseDocumentManifest({
        version: 1,
        items: [
          { id: 'a', kind: 'image', fileKey: 'a.jpg', order: 1 },
          { id: 'b', kind: 'image', fileKey: 'b.jpg', order: 3 },
        ],
      }),
    (error: unknown) =>
      (error as { code?: string }).code === 'DOCUMENT_ORDER_INVALID'
  );

  assert.throws(
    () =>
      parseDocumentManifest({
        version: 1,
        items: [
          { id: 'a', kind: 'image', fileKey: 'same.jpg', order: 1 },
          { id: 'a', kind: 'image', fileKey: 'other.jpg', order: 2 },
        ],
      }),
    (error: unknown) =>
      (error as { code?: string }).code === 'DOCUMENT_PAGE_DUPLICATED'
  );

  assert.throws(
    () =>
      parseDocumentManifest({
        version: 1,
        items: [
          { id: 'a', kind: 'image', fileKey: 'same.jpg', order: 1 },
          { id: 'b', kind: 'image', fileKey: 'same.jpg', order: 2 },
        ],
      }),
    (error: unknown) =>
      (error as { code?: string }).code === 'DOCUMENT_FILE_DUPLICATED'
  );
});

test('sanitizes a PDF name without accepting path separators', () => {
  assert.equal(sanitizePdfName('../Contrato: № 42.pdf'), 'Contrato No 42.pdf');
});

test('reads JPEG SOF dimensions without decoding image content', () => {
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0xb0, 0x03, 0x20, 0x03,
    0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
  ]);
  assert.deepEqual(readJpegDimensions(jpeg), {
    width: 800,
    height: 1200,
  });
});

test('keeps every qpdf path as an isolated execFile argument', () => {
  const hostilePath = 'source.pdf; Remove-Item important.pdf';
  const extractArgs = buildQpdfExtractArgs(hostilePath, 2, 'result.pdf');
  assert.equal(extractArgs[2], hostilePath);
  assert.equal(extractArgs.length, 6);

  const mergeArgs = buildQpdfMergeArgs(
    ['first page.pdf', hostilePath],
    'merged.pdf'
  );
  assert.deepEqual(mergeArgs, [
    '--empty',
    '--pages',
    'first page.pdf',
    '1',
    hostilePath,
    '1',
    '--',
    'merged.pdf',
  ]);
});
