import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'docs/manuales/manual-usuario.md');
const outputPath = path.join(
  rootDir,
  'public/tutorials/MANUAL_DE_USUARIO_ACTUALIZADO.pdf'
);
const tempDir = path.join(rootDir, 'tmp/pdfs');
const htmlPath = path.join(tempDir, 'manual-usuario.html');

const escapeHtml = value =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const inlineMarkdown = value =>
  escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

const closeLists = state => {
  const output = [];
  if (state.inUl) {
    output.push('</ul>');
    state.inUl = false;
  }
  if (state.inOl) {
    output.push('</ol>');
    state.inOl = false;
  }
  return output.join('\n');
};

const markdownToHtml = markdown => {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  const state = { inUl: false, inOl: false };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      html.push(closeLists(state));
      continue;
    }

    if (line.startsWith('# ')) {
      html.push(closeLists(state));
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      html.push(closeLists(state));
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      html.push(closeLists(state));
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (state.inOl) html.push('</ol>');
      state.inOl = false;
      if (!state.inUl) {
        html.push('<ul>');
        state.inUl = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (state.inUl) html.push('</ul>');
      state.inUl = false;
      if (!state.inOl) {
        html.push('<ol>');
        state.inOl = true;
      }
      html.push(`<li>${inlineMarkdown(orderedMatch[2])}</li>`);
      continue;
    }

    html.push(closeLists(state));
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  html.push(closeLists(state));
  return html.join('\n');
};

const buildHtml = markdown => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Manual de usuario de Dhyrium</title>
    <style>
      @page {
        size: A4;
        margin: 17mm 16mm 18mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #172033;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.5pt;
        line-height: 1.48;
      }

      .cover {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 246mm;
        page-break-after: always;
        border-left: 8px solid #0e9cd8;
        padding: 22mm 18mm;
        background: linear-gradient(135deg, #f5fbff 0%, #ffffff 68%);
      }

      .cover-kicker {
        color: #0e9cd8;
        font-size: 10pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .cover-title {
        margin: 10mm 0 4mm;
        color: #001b69;
        font-size: 34pt;
        line-height: 1.05;
        font-weight: 800;
      }

      .cover-subtitle {
        max-width: 125mm;
        color: #334155;
        font-size: 13pt;
      }

      .cover-meta {
        margin-top: 24mm;
        color: #64748b;
        font-size: 10pt;
      }

      main {
        counter-reset: section;
      }

      h1 {
        display: none;
      }

      h2 {
        margin: 0 0 5mm;
        color: #001b69;
        font-size: 18pt;
        line-height: 1.2;
        page-break-after: avoid;
      }

      h2:not(:first-of-type) {
        margin-top: 10mm;
      }

      h3 {
        margin: 6mm 0 2mm;
        color: #0f376f;
        font-size: 12pt;
        page-break-after: avoid;
      }

      p {
        margin: 0 0 3mm;
      }

      ul,
      ol {
        margin: 0 0 4mm 6mm;
        padding-left: 5mm;
      }

      li {
        margin-bottom: 1.6mm;
      }

      strong {
        color: #001b69;
      }

      code {
        border-radius: 4px;
        background: #edf6fc;
        color: #001b69;
        padding: 1px 4px;
        font-family: Consolas, monospace;
        font-size: 9.5pt;
      }

      h2,
      h3,
      p,
      li {
        break-inside: avoid;
      }

      .footer-note {
        margin-top: 10mm;
        border-top: 1px solid #d6e3f0;
        padding-top: 4mm;
        color: #64748b;
        font-size: 9pt;
      }
    </style>
  </head>
  <body>
    <section class="cover">
      <div class="cover-kicker">Dhyrium</div>
      <div class="cover-title">Manual de usuario</div>
      <div class="cover-subtitle">
        Guia practica para navegar el sistema, atender tareas, registrar tramites
        y consultar los modulos disponibles segun permisos.
      </div>
      <div class="cover-meta">Version actualizada - Junio 2026</div>
    </section>
    <main>
      ${markdownToHtml(markdown)}
      <p class="footer-note">
        Este documento se genera desde docs/manuales/manual-usuario.md.
      </p>
    </main>
  </body>
</html>`;

await fs.mkdir(tempDir, { recursive: true });
const markdown = await fs.readFile(inputPath, 'utf8');
const html = buildHtml(markdown);
await fs.writeFile(htmlPath, html, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
await page.goto(`file://${htmlPath.replaceAll('\\', '/')}`, {
  waitUntil: 'networkidle',
});
await page.pdf({
  path: outputPath,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-size:8px;color:#64748b;padding:0 16mm;text-align:right;">Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
  margin: {
    top: '17mm',
    right: '16mm',
    bottom: '18mm',
    left: '16mm',
  },
});
await browser.close();

console.log(`PDF generated: ${path.relative(rootDir, outputPath)}`);
