const OPERATIONAL_HOST = '172.16.10.250';
const OPERATIONAL_DATABASE = 'dbtaskmanager';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'dhyrium_db_local']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export type ReconciliationExecutionMode =
  | { mode: 'dry-run' }
  | { mode: 'apply-local' }
  | {
      mode: 'apply-remote';
      host: typeof OPERATIONAL_HOST;
      database: typeof OPERATIONAL_DATABASE;
      backupSha256: string;
    };

function argumentValue(args: readonly string[], name: string) {
  const prefix = `${name}=`;
  const matches = args.filter(argument => argument.startsWith(prefix));
  if (matches.length > 1) {
    throw new Error(`El argumento ${name} no puede repetirse.`);
  }
  return matches[0]?.slice(prefix.length);
}

function databaseTarget(databaseUrl: string) {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL no tiene un formato válido.');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!url.hostname || !database) {
    throw new Error('DATABASE_URL no identifica host y base de datos.');
  }
  return { host: url.hostname.toLowerCase(), database };
}

/**
 * Autoriza el modo de ejecución sin abrir conexiones ni exponer DATABASE_URL.
 * El destino operativo es deliberadamente cerrado; los argumentos esperados
 * funcionan como confirmación independiente, no como una forma de elegir otro
 * servidor.
 */
export function validateReconciliationExecutionRequest(
  args: readonly string[],
  databaseUrl: string | undefined
): ReconciliationExecutionMode {
  const applyLocal = args.includes('--apply');
  const applyRemote = args.includes('--apply-remote');
  if (applyLocal && applyRemote) {
    throw new Error('Use solamente uno de --apply o --apply-remote.');
  }
  if (!applyLocal && !applyRemote) return { mode: 'dry-run' };
  if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');

  const target = databaseTarget(databaseUrl);
  if (applyLocal) {
    if (!LOCAL_HOSTS.has(target.host)) {
      throw new Error(
        '--apply está reservado para la base local de desarrollo; use el gate remoto explícito.'
      );
    }
    return { mode: 'apply-local' };
  }

  const expectedHost = argumentValue(args, '--expected-host');
  const expectedDatabase = argumentValue(args, '--expected-database');
  const backupSha256 = argumentValue(args, '--backup-sha256');
  if (!expectedHost || !expectedDatabase || !backupSha256) {
    throw new Error(
      '--apply-remote exige --expected-host, --expected-database y --backup-sha256.'
    );
  }
  if (expectedHost.toLowerCase() !== OPERATIONAL_HOST) {
    throw new Error('El host confirmado no es el destino operativo autorizado.');
  }
  if (expectedDatabase !== OPERATIONAL_DATABASE) {
    throw new Error('La base confirmada no es el destino operativo autorizado.');
  }
  if (!SHA256_PATTERN.test(backupSha256)) {
    throw new Error('El SHA-256 del respaldo debe contener exactamente 64 hexadecimales.');
  }
  if (target.host !== OPERATIONAL_HOST) {
    throw new Error('DATABASE_URL no apunta al host operativo confirmado.');
  }
  if (target.database !== OPERATIONAL_DATABASE) {
    throw new Error('DATABASE_URL no apunta a la base operativa confirmada.');
  }

  return {
    mode: 'apply-remote',
    host: OPERATIONAL_HOST,
    database: OPERATIONAL_DATABASE,
    backupSha256: backupSha256.toLowerCase(),
  };
}

