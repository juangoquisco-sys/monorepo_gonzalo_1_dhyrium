import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasValidTutorialMaterialContent,
  sanitizeTutorialMaterialName,
  TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES,
  TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
  TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES,
  validateTutorialMaterialContent,
  validateTutorialMaterialMetadata,
  validateTutorialMaterialTotals,
} from '@/services/tutorialMaterials.policy';

const MiB = 1024 * 1024;

const allowedSamples = [
  {
    name: 'guia.pdf',
    mime: 'application/pdf',
    content: Buffer.from('%PDF-1.7'),
  },
  {
    name: 'guia.docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    content: Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('word/document.xml'),
    ]),
  },
  {
    name: 'datos.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('xl/workbook.xml'),
    ]),
  },
  {
    name: 'datos.xls',
    mime: 'application/vnd.ms-excel',
    content: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  },
  {
    name: 'macros.xlsm',
    mime: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    content: Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('xl/workbook.xml'),
    ]),
  },
  {
    name: 'datos.csv',
    mime: 'text/csv',
    content: Buffer.from('codigo,nombre\n1,Material'),
  },
  {
    name: 'notas.txt',
    mime: 'text/plain',
    content: Buffer.from('Material de apoyo'),
  },
  {
    name: 'charla.pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    content: Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('ppt/presentation.xml'),
    ]),
  },
  {
    name: 'foto.jpg',
    mime: 'image/jpeg',
    content: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  },
  {
    name: 'foto.jpeg',
    mime: 'image/jpeg',
    content: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  },
  {
    name: 'plano.png',
    mime: 'image/png',
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    name: 'captura.webp',
    mime: 'image/webp',
    content: Buffer.from('RIFF0000WEBP', 'ascii'),
  },
  {
    name: 'plano.dwg',
    mime: 'image/vnd.dwg',
    content: Buffer.from('AC1032', 'ascii'),
  },
  {
    name: 'plano.dxf',
    mime: 'image/vnd.dxf',
    content: Buffer.from('0\r\nSECTION\r\n2\r\nHEADER', 'ascii'),
  },
  {
    name: 'terreno.xml',
    mime: 'application/xml',
    content: Buffer.from('<?xml version="1.0"?><LandXML />'),
  },
  {
    name: 'subassembly.pkt',
    mime: 'application/octet-stream',
    content: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
  {
    name: 'materiales.zip',
    mime: 'application/zip',
    content: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
  {
    name: 'materiales.rar',
    mime: 'application/vnd.rar',
    content: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
  },
];

test('accepts every configured tutorial material format with matching MIME and signature', () => {
  for (const sample of allowedSamples) {
    const file = {
      originalname: sample.name,
      mimetype: sample.mime,
      size: sample.content.length,
    };
    assert.equal(validateTutorialMaterialMetadata(file), null, sample.name);
    assert.equal(
      validateTutorialMaterialContent(file, sample.content),
      null,
      sample.name
    );
  }
});

test('rejects blocked extensions, unknown formats, mismatched MIME and disguised content', () => {
  assert.match(
    validateTutorialMaterialMetadata({
      originalname: 'instalador.exe',
      mimetype: 'application/octet-stream',
      size: 10,
    }) || '',
    /bloqueada por seguridad/
  );
  assert.match(
    validateTutorialMaterialMetadata({
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      size: 10,
    }) || '',
    /no está permitido/
  );
  assert.match(
    validateTutorialMaterialMetadata({
      originalname: 'foto.jpg',
      mimetype: 'text/html',
      size: 10,
    }) || '',
    /no coincide/
  );
  assert.equal(
    hasValidTutorialMaterialContent(
      'pdf',
      Buffer.from('<html><script>alert(1)</script></html>')
    ),
    false
  );
  assert.equal(
    hasValidTutorialMaterialContent(
      'xml',
      Buffer.from('<?xml version="1.0"?><svg><script /></svg>')
    ),
    false
  );
});

test('enforces the 500 MB standard material limit', () => {
  const base = {
    originalname: 'reporte.pdf',
    mimetype: 'application/pdf',
  };
  assert.equal(
    validateTutorialMaterialMetadata({
      ...base,
      size: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES,
    }),
    null
  );
  assert.match(
    validateTutorialMaterialMetadata({
      ...base,
      size: TUTORIAL_MATERIAL_STANDARD_MAX_BYTES + 1,
    }) || '',
    /500 MB/
  );
});

test('enforces the 500 MB technical material limit', () => {
  const base = {
    originalname: 'plano.dwg',
    mimetype: 'image/vnd.dwg',
  };
  assert.equal(
    validateTutorialMaterialMetadata({
      ...base,
      size: TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES,
    }),
    null
  );
  assert.match(
    validateTutorialMaterialMetadata({
      ...base,
      size: TUTORIAL_MATERIAL_TECHNICAL_MAX_BYTES + 1,
    }) || '',
    /500 MB/
  );
});

test('enforces the 1 GB compressed material limit', () => {
  const base = {
    originalname: 'materiales.zip',
    mimetype: 'application/zip',
  };
  assert.equal(
    validateTutorialMaterialMetadata({
      ...base,
      size: TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES,
    }),
    null
  );
  assert.match(
    validateTutorialMaterialMetadata({
      ...base,
      size: TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES + 1,
    }) || '',
    /1 GB/
  );
});

test('enforces 15 files during creation and while editing existing materials', () => {
  const newFile = {
    originalname: 'material.txt',
    mimetype: 'text/plain',
    size: 1,
  };
  assert.equal(
    validateTutorialMaterialTotals([], Array(15).fill(newFile)),
    null
  );
  assert.match(
    validateTutorialMaterialTotals([], Array(16).fill(newFile)) || '',
    /máximo permitido es 15/
  );
  assert.equal(
    validateTutorialMaterialTotals(Array(14).fill(1), [newFile]),
    null
  );
  assert.match(
    validateTutorialMaterialTotals(Array(15).fill(1), [newFile]) || '',
    /máximo permitido es 15/
  );
});

test('enforces the 2 GB accumulated limit with existing and new files', () => {
  const archive = {
    originalname: 'materiales.zip',
    mimetype: 'application/zip',
    size: 512 * MiB,
  };
  assert.equal(validateTutorialMaterialTotals([1536 * MiB], [archive]), null);
  assert.match(
    validateTutorialMaterialTotals([1536 * MiB + 1], [archive]) || '',
    /máximo acumulado por tutorial es 2 GB/
  );
});

test('sanitizes traversal, control characters and reserved filename separators', () => {
  assert.equal(
    sanitizeTutorialMaterialName('../..\\planos\u0000$$final.dwg'),
    'planos_final.dwg'
  );
});
