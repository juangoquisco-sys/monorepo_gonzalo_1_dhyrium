import '@/config/env';
import Server from '@/models/server';

const isDatabaseConnectionError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : JSON.stringify(error ?? '');
  return (
    message.includes("Can't reach database server") || message.includes('P1001')
  );
};

process.on('unhandledRejection', reason => {
  if (isDatabaseConnectionError(reason)) {
    console.error(
      'Base de datos no disponible. El servidor continua activo para endpoints que no dependan de BD.',
      reason
    );
    return;
  }

  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  if (isDatabaseConnectionError(error)) {
    console.error(
      'Base de datos no disponible. El servidor continua activo para endpoints que no dependan de BD.',
      error
    );
    return;
  }

  console.error('Uncaught exception:', error);
  process.exit(1);
});

const server = new Server();

server.listen();

let isShuttingDown = false;
const shutdown = async (signal: 'SIGINT' | 'SIGTERM') => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`Cerrando servidor (${signal})`);

  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    console.error('No se pudo cerrar el servidor limpiamente', error);
    process.exit(1);
  }
};

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
