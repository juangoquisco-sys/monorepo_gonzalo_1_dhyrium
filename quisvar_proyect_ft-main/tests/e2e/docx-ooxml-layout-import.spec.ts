import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:8001';

const buildDocxWithHeaderAndFooter = async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="png" ContentType="image/png"/>
    </Types>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body><w:p><w:r><w:t>Cuerpo</w:t></w:r></w:p><w:sectPr>
        <w:headerReference w:type="default" r:id="rIdHeader"/>
        <w:footerReference w:type="default" r:id="rIdFooter"/>
        <w:pgSz w:w="12240" w:h="15840"/>
        <w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080" w:header="720" w:footer="720"/>
      </w:sectPr></w:body>
    </w:document>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rIdHeader" Target="header1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"/>
      <Relationship Id="rIdFooter" Target="footer1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"/>
    </Relationships>`);
  zip.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
      xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
      <w:tbl><w:tr><w:tc><w:p><w:r><w:b/><w:t>ENCABEZADO DHYRIUM</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      <w:p><w:r><w:drawing><wp:inline><wp:extent cx="914400" cy="457200"/><wp:docPr id="1" name="Logo" descr="Logo institucional"/><a:graphic><a:graphicData><a:blip r:embed="rIdLogo"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
    </w:hdr>`);
  zip.file('word/_rels/header1.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rIdLogo" Target="media/logo.png" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"/>
    </Relationships>`);
  zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:p><w:r><w:i/><w:t>PIE DE PÁGINA</w:t></w:r></w:p>
    </w:ftr>`);
  zip.file(
    'word/media/logo.png',
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XTBzAAAAAElFTkSuQmCC', 'base64')
  );
  return zip.generateAsync({ type: 'base64' });
};

test('el lector OOXML recupera encabezado, pie, imagen y configuración de página', async ({ page }) => {
  await page.goto(`${APP_URL}/img/quisvar_logo.png`);
  const docxBase64 = await buildDocxWithHeaderAndFooter();
  const result = await page.evaluate(async encodedDocx => {
    const module = await import('/src/pages/specialities/pages/project/pages/task/components/taskDocumentEditor/docxOoxmlImport.ts');
    const bytes = Uint8Array.from(atob(encodedDocx), character => character.charCodeAt(0));
    return module.extractDocxOoxmlLayout(
      bytes.buffer,
      async image => `https://assets.dhyrium.test/${image.fileName}`
    );
  }, docxBase64);

  expect(result.headerHtml).toContain('ENCABEZADO DHYRIUM');
  expect(result.headerHtml).toContain('<table');
  expect(result.headerHtml).toContain('<img');
  expect(result.headerHtml).toContain('width="96"');
  expect(result.footerHtml).toContain('PIE DE PÁGINA');
  expect(result.imageCount).toBe(1);
  expect(result.omittedImageCount).toBe(0);
  expect(result.pageSetup).toMatchObject({
    width: 816,
    height: 1056,
    margins: [96, 72, 96, 72],
    headerTop: 48,
    footerBottom: 48,
    paperDirection: 'vertical',
  });
});

test('el documento real 02.02.02D recupera su encabezado y sus imágenes', async ({ page }) => {
  test.setTimeout(120_000);
  const documentPath = path.resolve('.agent-local', '02.02.02D.BLOQUE B.docx');
  test.skip(!existsSync(documentPath), 'El DOCX real solo está disponible en el entorno de validación Dhyrium.');
  await page.goto(`${APP_URL}/img/quisvar_logo.png`);
  const docxBase64 = (await readFile(documentPath)).toString('base64');
  const result = await page.evaluate(async encodedDocx => {
    const module = await import('/src/pages/specialities/pages/project/pages/task/components/taskDocumentEditor/docxOoxmlImport.ts');
    const bytes = Uint8Array.from(atob(encodedDocx), character => character.charCodeAt(0));
    return module.extractDocxOoxmlLayout(
      bytes.buffer,
      async image => `https://assets.dhyrium.test/${image.fileName}`
    );
  }, docxBase64);

  expect(result.headerPartCount).toBeGreaterThanOrEqual(1);
  expect(result.footerPartCount).toBeGreaterThanOrEqual(1);
  expect(result.headerHtml).toContain('<table');
  expect(result.headerHtml).toContain('<img');
  expect(result.imageCount).toBeGreaterThanOrEqual(2);
  expect(result.pageSetup?.width).toBeGreaterThan(700);
  expect(result.pageSetup?.height).toBeGreaterThan(1_000);
});
