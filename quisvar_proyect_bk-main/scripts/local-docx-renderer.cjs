'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const HOST = process.env.DOCX_RENDERER_HOST || '0.0.0.0';
const PORT = Number(process.env.DOCX_RENDERER_PORT || 8092);
const TOKEN = process.env.DOCX_RENDERER_TOKEN || 'dhyrium-local-word-renderer-v1';
const MAX_BYTES = 50 * 1024 * 1024;
const POWERSHELL = process.env.SystemRoot
  ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  : 'powershell.exe';
const EXPORT_SCRIPT = path.join(__dirname, 'word-export-pdf.ps1');
let conversionQueue = Promise.resolve();

const sendText = (response, status, message) => {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
};

const runPowerShell = args =>
  new Promise((resolve, reject) => {
    const child = spawn(POWERSHELL, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Microsoft Word superó el tiempo máximo de conversión.'));
    }, 120_000);
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', code => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || `PowerShell terminó con código ${code}.`));
    });
  });

const collectBody = request =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(Object.assign(new Error('El DOCX supera 50 MB.'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.once('end', () => resolve(Buffer.concat(chunks)));
    request.once('error', reject);
  });

const convert = async buffer => {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw Object.assign(new Error('El archivo no es un contenedor DOCX válido.'), {
      status: 415,
    });
  }
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dhyrium-word-renderer-'));
  const inputPath = path.join(directory, 'document.docx');
  const outputPath = path.join(directory, 'document.pdf');
  const metadataPath = path.join(directory, 'pages.txt');
  try {
    await fs.writeFile(inputPath, buffer);
    await runPowerShell([
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      EXPORT_SCRIPT,
      '-InputPath',
      inputPath,
      '-OutputPath',
      outputPath,
      '-MetadataPath',
      metadataPath,
    ]);
    const [pdf, pageText] = await Promise.all([
      fs.readFile(outputPath),
      fs.readFile(metadataPath, 'ascii'),
    ]);
    if (pdf.subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('Microsoft Word no generó un PDF válido.');
    }
    return { pdf, pageCount: Number(pageText.trim()) };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
};

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendText(response, 200, 'ok');
    return;
  }
  if (request.method !== 'POST' || request.url !== '/render/docx-to-pdf') {
    sendText(response, 404, 'Not found');
    return;
  }
  if (request.headers['x-dhyrium-renderer-token'] !== TOKEN) {
    sendText(response, 401, 'Unauthorized');
    return;
  }

  try {
    const body = await collectBody(request);
    const queuedConversion = conversionQueue.then(() => convert(body));
    conversionQueue = queuedConversion.then(() => undefined, () => undefined);
    const { pdf, pageCount } = await queuedConversion;
    response.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'X-Document-Page-Count': Number.isSafeInteger(pageCount) ? pageCount : '',
      'Cache-Control': 'no-store',
    });
    response.end(pdf);
  } catch (error) {
    console.error(new Date().toISOString(), error);
    sendText(response, error.status || 500, error.message || 'Conversion failed');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Dhyrium Word renderer: http://${HOST}:${PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
