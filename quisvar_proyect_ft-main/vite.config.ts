import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';

const getGitCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'local';
  }
};

const buildDate = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Lima',
}).format(new Date());

const ON_DEMAND_PRELOAD_CHUNKS = [
  'exceljs.min',
  'html2canvas',
  'portal-',
  'useHtmlToPdf',
  'ViewHtmlToPdf',
  'ViewPdf',
];

// Usa la IP LAN fija de esta misma PC. Evita el relay de `localhost` de Docker
// Desktop, que puede conservar conexiones colgadas después de recrear el backend.
const LOCAL_BACKEND_TARGET = 'http://172.16.10.177:8081';
const LOCAL_BACKEND_PATHS =
  '^/(api|socket\\.io|projects|uploads|index|models|editables|reviews|task-document-assets|file-user|general|reports|images|public|api-docs|iclock)(/|$)';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_COMMIT__: JSON.stringify(getGitCommit()),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 8001,
    proxy: {
      [LOCAL_BACKEND_PATHS]: {
        target: LOCAL_BACKEND_TARGET,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps, { hostType }) {
        if (hostType !== 'html') return deps;

        return deps.filter(
          dep =>
            !ON_DEMAND_PRELOAD_CHUNKS.some(chunkName => dep.includes(chunkName))
        );
      },
    },
  },
});
