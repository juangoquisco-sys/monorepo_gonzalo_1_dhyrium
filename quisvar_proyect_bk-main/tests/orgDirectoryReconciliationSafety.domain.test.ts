import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReconciliationExecutionRequest } from '../src/services/orgDirectoryReconciliationSafety.domain';

const localUrl = 'postgresql://local-user:local-password@127.0.0.1:5432/localdb';
const operationalUrl =
  'postgresql://operational-user:secret@172.16.10.250:5432/dbtaskmanager?schema=public';
const backupSha256 = 'a'.repeat(64);
const remoteArgs = [
  '--apply-remote',
  '--expected-host=172.16.10.250',
  '--expected-database=dbtaskmanager',
  `--backup-sha256=${backupSha256}`,
];

test('dry-run no necesita credenciales de confirmación y nunca habilita escritura', () => {
  assert.deepEqual(validateReconciliationExecutionRequest([], operationalUrl), {
    mode: 'dry-run',
  });
});

test('--apply conserva el gate exclusivo para una base local', () => {
  assert.deepEqual(validateReconciliationExecutionRequest(['--apply'], localUrl), {
    mode: 'apply-local',
  });
  assert.throws(
    () => validateReconciliationExecutionRequest(['--apply'], operationalUrl),
    /reservado para la base local/
  );
});

test('el modo remoto exige las tres confirmaciones y un SHA-256 válido', () => {
  assert.throws(
    () =>
      validateReconciliationExecutionRequest(
        ['--apply-remote', '--expected-host=172.16.10.250'],
        operationalUrl
      ),
    /exige --expected-host/
  );
  assert.throws(
    () =>
      validateReconciliationExecutionRequest(
        remoteArgs.map(argument =>
          argument.startsWith('--backup-sha256=')
            ? '--backup-sha256=no-es-un-hash'
            : argument
        ),
        operationalUrl
      ),
    /64 hexadecimales/
  );
});

test('rechaza confirmaciones o DATABASE_URL de otro host o base', () => {
  assert.throws(
    () =>
      validateReconciliationExecutionRequest(
        remoteArgs.map(argument =>
          argument === '--expected-host=172.16.10.250'
            ? '--expected-host=172.16.10.251'
            : argument
        ),
        operationalUrl
      ),
    /host confirmado/
  );
  assert.throws(
    () =>
      validateReconciliationExecutionRequest(
        remoteArgs,
        'postgresql://user:secret@172.16.10.251:5432/dbtaskmanager'
      ),
    /no apunta al host operativo/
  );
  assert.throws(
    () =>
      validateReconciliationExecutionRequest(
        remoteArgs,
        'postgresql://user:secret@172.16.10.250:5432/otra_base'
      ),
    /no apunta a la base operativa/
  );
});

test('autoriza exclusivamente el destino operativo respaldado', () => {
  assert.deepEqual(
    validateReconciliationExecutionRequest(remoteArgs, operationalUrl),
    {
      mode: 'apply-remote',
      host: '172.16.10.250',
      database: 'dbtaskmanager',
      backupSha256,
    }
  );
});

test('rechaza flags de escritura incompatibles', () => {
  assert.throws(
    () =>
      validateReconciliationExecutionRequest(
        ['--apply', ...remoteArgs],
        operationalUrl
      ),
    /solamente uno/
  );
});

