import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import {
  inspectDocxPackage,
  preserveDocxNoOp,
} from '@/modules/task-documents/taskDocumentOpcInspector';

interface SyntheticZipEntry {
  name: string;
  data: Buffer | string;
  flags?: number;
  compressionMethod?: 0 | 8;
  compressedData?: Buffer;
  declaredExpandedBytes?: number;
  crcOverride?: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (buffer: Buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
};

const createSyntheticZip = (entries: SyntheticZipEntry[]) => {
  const localRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data, 'utf8');
    const method = entry.compressionMethod ?? 8;
    const compressed =
      entry.compressedData ?? (method === 8 ? deflateRawSync(data) : data);
    const flags = entry.flags ?? 0x0800;
    const crc = entry.crcOverride ?? crc32(data);
    const expandedBytes = entry.declaredExpandedBytes ?? data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(flags, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(expandedBytes, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localRecords.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(flags, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(expandedBytes, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralRecords.push(centralHeader, name);

    localOffset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localRecords, centralDirectory, eocd]);
};

const TRANSITIONAL_WORD_NAMESPACE =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const STRICT_WORD_NAMESPACE =
  'http://purl.oclc.org/ooxml/wordprocessingml/main';
const TRANSITIONAL_OFFICE_RELATIONSHIP =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';
const STRICT_OFFICE_RELATIONSHIP =
  'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument';

interface MinimalDocxOptions {
  conformance?: 'strict' | 'transitional';
  documentContentType?: string;
  contentTypeOverrides?: Array<{ part: string; contentType: string }>;
  contentTypesXml?: string;
  rootRelationshipsXml?: string;
  documentRelationships?: string;
  additionalEntries?: SyntheticZipEntry[];
  documentXml?: string;
}

const createMinimalDocx = (options: MinimalDocxOptions = {}) => {
  const conformance = options.conformance ?? 'transitional';
  const wordNamespace =
    conformance === 'strict'
      ? STRICT_WORD_NAMESPACE
      : TRANSITIONAL_WORD_NAMESPACE;
  const officeRelationship =
    conformance === 'strict'
      ? STRICT_OFFICE_RELATIONSHIP
      : TRANSITIONAL_OFFICE_RELATIONSHIP;
  const overrides = options.contentTypeOverrides ?? [];
  const generatedContentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/word/document.xml" ContentType="${
    options.documentContentType ??
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
  }"/>
  ${overrides
    .map(
      override =>
        `<Override PartName="/${override.part}" ContentType="${override.contentType}"/>`
    )
    .join('\n')}
</Types>`;
  const generatedRootRelationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${officeRelationship}" Target="word/document.xml"/>
</Relationships>`;
  const contentTypes = options.contentTypesXml ?? generatedContentTypes;
  const rootRelationships =
    options.rootRelationshipsXml ?? generatedRootRelationships;
  const document =
    options.documentXml ??
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="${wordNamespace}"><w:body><w:p><w:r><w:t>Hola Dhyrium</w:t></w:r></w:p></w:body></w:document>`;

  const entries: SyntheticZipEntry[] = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRelationships },
    { name: 'word/document.xml', data: document },
  ];
  if (options.documentRelationships) {
    entries.push({
      name: 'word/_rels/document.xml.rels',
      data: options.documentRelationships,
    });
  }
  entries.push(...(options.additionalEntries ?? []));
  return createSyntheticZip(entries);
};

const issueCodes = (buffer: Buffer, limits = {}) =>
  inspectDocxPackage(buffer, limits).issues.map(issue => issue.code);

describe('inspector DOCX/OPC seguro', () => {
  it('acepta un DOCX Transitional minimo y verifica cada CRC', () => {
    const docx = createMinimalDocx();
    const report = inspectDocxPackage(docx);

    assert.equal(report.verdict, 'compatible');
    assert.equal(report.editingGate, 'eligible');
    assert.equal(report.ooxmlConformance, 'transitional');
    assert.equal(report.package.entryCount, 3);
    assert.equal(report.parts.length, 3);
    assert.equal(report.relationships.length, 1);
    assert.deepEqual(report.issues, []);
    assert.deepEqual(report.flags, {
      encrypted: false,
      macros: false,
      activeX: false,
      oleObjects: false,
      externalRelationships: false,
    });
  });

  it('detecta de forma independiente un paquete OOXML Strict', () => {
    const report = inspectDocxPackage(
      createMinimalDocx({ conformance: 'strict' })
    );

    assert.equal(report.verdict, 'compatible');
    assert.equal(report.ooxmlConformance, 'strict');
  });

  it('clasifica partes opacas no peligrosas como preserved', () => {
    const report = inspectDocxPackage(
      createMinimalDocx({
        additionalEntries: [
          {
            name: 'word/comments.xml',
            data: '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
          },
        ],
      })
    );

    assert.equal(report.verdict, 'preserved');
    assert.equal(report.editingGate, 'requires-opaque-preservation-engine');
    assert.equal(report.requiresOpaquePreservation, true);
    assert.ok(
      issueCodes(
        createMinimalDocx({
          additionalEntries: [
            { name: 'word/comments.xml', data: '<comments/>' },
          ],
        })
      ).includes('OPC_OPAQUE_PART_PRESERVED')
    );
  });

  it('mantiene el gate bloqueado aunque el diagnostico llegue al limite de issues', () => {
    const opaqueParts: SyntheticZipEntry[] = Array.from(
      { length: 256 },
      (_value, index) => ({
        name: `customOpaque/item-${index}.bin`,
        data: `opaque-${index}`,
      })
    );
    const report = inspectDocxPackage(
      createMinimalDocx({
        contentTypeOverrides: [
          {
            part: 'word/vbaProject.bin',
            contentType: 'application/vnd.ms-office.vbaProject',
          },
        ],
        additionalEntries: [
          ...opaqueParts,
          { name: 'word/vbaProject.bin', data: 'vba' },
        ],
      })
    );

    assert.equal(report.issues.length, 256);
    assert.equal(report.flags.macros, true);
    assert.equal(
      report.parts.find(part => part.name === 'word/vbaProject.bin')
        ?.disposition,
      'blocked'
    );
    assert.equal(report.verdict, 'blocked');
    assert.equal(report.editingGate, 'blocked');
  });

  it('rechaza shadowing de atributos y elementos en partes .rels', () => {
    const shadowedExternalRelationship = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" xmlns:foo="urn:attacker">
  <Relationship Id="rId1" Type="${TRANSITIONAL_OFFICE_RELATIONSHIP}" Target="word/document.xml"/>
  <Relationship Id="rExt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" foo:Target="word/document.xml" Target="https://example.invalid/" foo:TargetMode="Internal" TargetMode="External"/>
</Relationships>`;
    const attributeReport = inspectDocxPackage(
      createMinimalDocx({
        rootRelationshipsXml: shadowedExternalRelationship,
      })
    );
    assert.equal(attributeReport.verdict, 'blocked');
    assert.ok(
      attributeReport.issues.some(
        issue => issue.code === 'OPC_ATTRIBUTE_NAMESPACE_INVALID'
      )
    );

    const wrongNamespaceRelationship = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" xmlns:foo="urn:attacker">
  <Relationship Id="rId1" Type="${TRANSITIONAL_OFFICE_RELATIONSHIP}" Target="word/document.xml"/>
  <foo:Relationship Id="rExt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/" TargetMode="External"/>
</Relationships>`;
    const elementReport = inspectDocxPackage(
      createMinimalDocx({ rootRelationshipsXml: wrongNamespaceRelationship })
    );
    assert.equal(elementReport.verdict, 'blocked');
    assert.ok(
      elementReport.issues.some(
        issue => issue.code === 'OPC_ELEMENT_NAMESPACE_INVALID'
      )
    );
  });

  it('rechaza shadowing de ContentType y elementos ajenos en el manifiesto OPC', () => {
    const contentTypesWithAlias = `<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" xmlns:foo="urn:attacker">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/customPayload.bin" foo:ContentType="application/octet-stream" ContentType="application/vnd.ms-office.vbaProject"/>
</Types>`;
    const attributeReport = inspectDocxPackage(
      createMinimalDocx({
        contentTypesXml: contentTypesWithAlias,
        additionalEntries: [
          { name: 'word/customPayload.bin', data: 'active payload' },
        ],
      })
    );
    assert.equal(attributeReport.verdict, 'blocked');
    assert.ok(
      attributeReport.issues.some(
        issue => issue.code === 'OPC_ATTRIBUTE_NAMESPACE_INVALID'
      )
    );

    const contentTypesWithForeignElement = `<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" xmlns:foo="urn:attacker">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <foo:Override PartName="/word/customPayload.bin" ContentType="application/octet-stream"/>
</Types>`;
    const elementReport = inspectDocxPackage(
      createMinimalDocx({
        contentTypesXml: contentTypesWithForeignElement,
        additionalEntries: [
          { name: 'word/customPayload.bin', data: 'opaque payload' },
        ],
      })
    );
    assert.equal(elementReport.verdict, 'blocked');
    assert.ok(
      elementReport.issues.some(
        issue => issue.code === 'OPC_ELEMENT_NAMESPACE_INVALID'
      )
    );
  });

  it('bloquea macros, ActiveX, OLE y relaciones externas sin ejecutarlos', () => {
    const relationshipXml = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rExt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/" TargetMode="External"/>
  <Relationship Id="rOle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="embeddings/oleObject1.bin"/>
  <Relationship Id="rVba" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/>
  <Relationship Id="rActiveX" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/control" Target="activeX/activeX1.bin"/>
</Relationships>`;
    const docx = createMinimalDocx({
      documentContentType:
        'application/vnd.ms-word.document.macroEnabled.main+xml',
      documentRelationships: relationshipXml,
      contentTypeOverrides: [
        {
          part: 'word/vbaProject.bin',
          contentType: 'application/vnd.ms-office.vbaProject',
        },
        {
          part: 'word/activeX/activeX1.bin',
          contentType: 'application/vnd.ms-office.activeX',
        },
        {
          part: 'word/embeddings/oleObject1.bin',
          contentType:
            'application/vnd.openxmlformats-officedocument.oleObject',
        },
      ],
      additionalEntries: [
        { name: 'word/vbaProject.bin', data: 'vba' },
        { name: 'word/activeX/activeX1.bin', data: 'activex' },
        { name: 'word/embeddings/oleObject1.bin', data: 'ole' },
      ],
    });
    const report = inspectDocxPackage(docx);

    assert.equal(report.verdict, 'blocked');
    assert.equal(report.editingGate, 'blocked');
    assert.deepEqual(report.flags, {
      encrypted: false,
      macros: true,
      activeX: true,
      oleObjects: true,
      externalRelationships: true,
    });
    assert.ok(
      report.issues.some(issue => issue.code === 'OPC_EXTERNAL_RELATIONSHIP')
    );
    assert.ok(report.issues.some(issue => issue.code === 'OPC_MACROS_PART'));
    assert.ok(report.issues.some(issue => issue.code === 'OPC_ACTIVEX_PART'));
    assert.ok(
      report.issues.some(issue => issue.code === 'OPC_OLEOBJECTS_PART')
    );
  });

  it('rechaza traversal, rutas absolutas, separadores Windows y NUL', () => {
    const unsafePaths = [
      ['../evil.xml', 'ZIP_PATH_TRAVERSAL'],
      ['/evil.xml', 'ZIP_ABSOLUTE_PATH'],
      ['C:/evil.xml', 'ZIP_ABSOLUTE_PATH'],
      ['word\\evil.xml', 'ZIP_ABSOLUTE_PATH'],
      ['word/evil\0.xml', 'ZIP_PATH_NUL'],
      ['word/%2e%2e/evil.xml', 'ZIP_PATH_TRAVERSAL'],
    ] as const;

    for (const [unsafePath, expectedCode] of unsafePaths) {
      const docx = createMinimalDocx({
        additionalEntries: [{ name: unsafePath, data: '<evil/>' }],
      });
      assert.ok(
        issueCodes(docx).includes(expectedCode),
        `${unsafePath} debio producir ${expectedCode}`
      );
    }
  });

  it('rechaza nombres duplicados incluso con diferencias de mayusculas', () => {
    const exactDuplicate = createSyntheticZip([
      { name: '[Content_Types].xml', data: '<Types/>' },
      { name: '[Content_Types].xml', data: '<Types/>' },
      { name: '_rels/.rels', data: '<Relationships/>' },
      { name: 'word/document.xml', data: '<document/>' },
    ]);
    assert.ok(issueCodes(exactDuplicate).includes('ZIP_DUPLICATE_PART'));

    const ambiguousCase = createMinimalDocx({
      additionalEntries: [{ name: 'WORD/DOCUMENT.XML', data: '<document/>' }],
    });
    assert.ok(issueCodes(ambiguousCase).includes('ZIP_DUPLICATE_PART'));
  });

  it('rechaza entradas ZIP cifradas sin confundir un contenedor CFB generico', () => {
    const contentTypes = createMinimalDocx();
    const encrypted = createSyntheticZip([
      {
        name: '[Content_Types].xml',
        data: '<Types/>',
      },
      { name: '_rels/.rels', data: '<Relationships/>' },
      { name: 'word/document.xml', data: contentTypes, flags: 0x0801 },
    ]);
    const report = inspectDocxPackage(encrypted);

    assert.equal(report.verdict, 'blocked');
    assert.equal(report.flags.encrypted, true);
    assert.ok(
      report.issues.some(issue => issue.code === 'ZIP_ENCRYPTED_ENTRY')
    );

    const genericCfb = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(504),
    ]);
    const cfbReport = inspectDocxPackage(genericCfb);
    assert.equal(cfbReport.verdict, 'blocked');
    assert.equal(cfbReport.editingGate, 'blocked');
    assert.equal(cfbReport.flags.encrypted, false);
    assert.ok(
      cfbReport.issues.some(issue => issue.code === 'CFB_CONTAINER_BLOCKED')
    );
  });

  it('exige las tres partes OPC minimas', () => {
    const missingDocument = createSyntheticZip([
      { name: '[Content_Types].xml', data: '<Types/>' },
      { name: '_rels/.rels', data: '<Relationships/>' },
    ]);

    assert.ok(
      issueCodes(missingDocument).includes('OPC_REQUIRED_PART_MISSING')
    );
  });

  it('aplica limites de archivo, entradas, expansion y ratio desde el central directory', () => {
    const valid = createMinimalDocx();
    assert.ok(
      issueCodes(valid, { maxInputBytes: valid.length - 1 }).includes(
        'ZIP_INPUT_TOO_LARGE'
      )
    );
    assert.ok(
      issueCodes(valid, { maxEntries: 2 }).includes('ZIP_ENTRY_COUNT_LIMIT')
    );
    assert.ok(
      issueCodes(valid, { maxExpandedBytes: 128 }).includes(
        'ZIP_TOTAL_EXPANDED_LIMIT'
      )
    );
    assert.ok(
      issueCodes(valid, { maxEntryExpandedBytes: 128 }).includes(
        'ZIP_ENTRY_EXPANDED_LIMIT'
      )
    );

    const declaredBomb = createMinimalDocx({
      additionalEntries: [
        {
          name: 'word/bomb.xml',
          data: 'x',
          declaredExpandedBytes: 10_000_000,
          compressedData: Buffer.from([0xff, 0xff]),
        },
      ],
    });
    const codes = issueCodes(declaredBomb, {
      maxEntryExpandedBytes: 20_000_000,
      maxExpandedBytes: 20_000_000,
      maxCompressionRatio: 10,
    });
    assert.ok(codes.includes('ZIP_ENTRY_RATIO_LIMIT'));
    assert.equal(codes.includes('ZIP_DECOMPRESSION_FAILED'), false);
  });

  it('aplica limites de ruta y XML antes de habilitar la edicion', () => {
    const deepPart = createMinimalDocx({
      additionalEntries: [{ name: 'word/a/b/c/opaque.xml', data: '<opaque/>' }],
    });
    assert.ok(
      issueCodes(deepPart, { maxPathDepth: 3 }).includes('ZIP_PATH_DEPTH_LIMIT')
    );
    assert.ok(
      issueCodes(deepPart, { maxPathLength: 20 }).includes('ZIP_PATH_TOO_LONG')
    );

    const valid = createMinimalDocx();
    assert.ok(
      issueCodes(valid, { maxXmlBytes: 128 }).includes('XML_SIZE_LIMIT')
    );
    assert.ok(
      issueCodes(valid, { maxXmlDepth: 2 }).includes('XML_DEPTH_LIMIT')
    );
    assert.ok(issueCodes(valid, { maxXmlTags: 2 }).includes('XML_TAG_LIMIT'));
  });

  it('valida CRC y rechaza XML con DTD o entidades declaradas', () => {
    const corrupted = createSyntheticZip([
      ...[
        { name: '[Content_Types].xml', data: '<Types/>' },
        { name: '_rels/.rels', data: '<Relationships/>' },
      ],
      {
        name: 'word/document.xml',
        data: '<document/>',
        crcOverride: 0,
      },
    ]);
    assert.ok(issueCodes(corrupted).includes('ZIP_CRC_MISMATCH'));

    const withDtd = createMinimalDocx({
      documentXml: `<?xml version="1.0"?><!DOCTYPE document [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><w:document xmlns:w="${TRANSITIONAL_WORD_NAMESPACE}"><w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body></w:document>`,
    });
    assert.ok(issueCodes(withDtd).includes('XML_DTD_FORBIDDEN'));
  });

  it('rechaza ZIP64, multidisco y metadata local inconsistente', () => {
    const valid = createMinimalDocx();
    const zip64 = Buffer.from(valid);
    zip64.writeUInt16LE(0xffff, zip64.length - 22 + 10);
    assert.ok(issueCodes(zip64).includes('ZIP64_UNSUPPORTED'));

    const multidisk = Buffer.from(valid);
    multidisk.writeUInt16LE(1, multidisk.length - 22 + 4);
    assert.ok(issueCodes(multidisk).includes('ZIP_MULTIDISK_UNSUPPORTED'));

    const localMismatch = Buffer.from(valid);
    localMismatch.writeUInt16LE(0, 8);
    assert.ok(
      issueCodes(localMismatch).includes('ZIP_LOCAL_METADATA_MISMATCH')
    );
  });

  it('rechaza prefijos, huecos y entradas locales no indexadas', () => {
    const valid = createMinimalDocx();
    assert.ok(
      issueCodes(Buffer.concat([Buffer.from('shadow'), valid])).includes(
        'ZIP_PREFIX_FORBIDDEN'
      )
    );

    const oldEocdOffset = valid.length - 22;
    const oldCentralOffset = valid.readUInt32LE(oldEocdOffset + 16);
    const shadowLocalRecord = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    const withUnindexedRecord = Buffer.concat([
      valid.subarray(0, oldCentralOffset),
      shadowLocalRecord,
      valid.subarray(oldCentralOffset),
    ]);
    const movedEocdOffset = oldEocdOffset + shadowLocalRecord.length;
    withUnindexedRecord.writeUInt32LE(
      oldCentralOffset + shadowLocalRecord.length,
      movedEocdOffset + 16
    );
    assert.ok(
      issueCodes(withUnindexedRecord).includes('ZIP_UNINDEXED_DATA_GAP')
    );

    const withCentralGap = Buffer.concat([
      valid.subarray(0, oldEocdOffset),
      Buffer.from('gap'),
      valid.subarray(oldEocdOffset),
    ]);
    assert.ok(
      issueCodes(withCentralGap).includes('ZIP_CENTRAL_DIRECTORY_RANGE')
    );
  });

  it('bloquea buffers truncados o arbitrarios sin propagar errores del parser', () => {
    for (let length = 0; length <= 96; length += 1) {
      const malformed = Buffer.alloc(length);
      for (let index = 0; index < malformed.length; index += 1) {
        malformed[index] = (index * 31 + length * 17) & 0xff;
      }
      const report = inspectDocxPackage(malformed);
      assert.equal(report.verdict, 'blocked');
      assert.equal(report.editingGate, 'blocked');
      assert.ok(report.issues.length >= 1);
    }
  });

  it('devuelve exactamente el mismo Buffer y SHA-256 en un no-op', () => {
    const original = createMinimalDocx();
    const snapshot = Buffer.from(original);
    const result = preserveDocxNoOp(original);

    assert.strictEqual(result.buffer, original);
    assert.deepEqual(result.buffer, snapshot);
    assert.equal(result.byteLength, original.length);
    assert.equal(result.byteIdentical, true);
    assert.equal(
      result.sha256,
      createHash('sha256').update(snapshot).digest('hex')
    );
    assert.equal(result.sha256, result.inspection.sha256);
  });

  it('inspecciona el fixture DOCX real local sin reconstruirlo', testContext => {
    const fixturePath = path.resolve(
      __dirname,
      '..',
      '..',
      'Guia_entornos_desarrollo_y_git_Dhyrium.docx'
    );
    if (!existsSync(fixturePath)) {
      testContext.skip('Fixture real no disponible en este entorno.');
      return;
    }

    const fixture = readFileSync(fixturePath);
    const before = Buffer.from(fixture);
    const result = preserveDocxNoOp(fixture);

    assert.ok(result.inspection.package.entryCount >= 3);
    assert.ok(
      ['strict', 'transitional'].includes(result.inspection.ooxmlConformance)
    );
    assert.deepEqual(result.buffer, before);
    assert.strictEqual(result.buffer, fixture);
    assert.equal(
      result.sha256,
      createHash('sha256').update(before).digest('hex')
    );
  });
});
