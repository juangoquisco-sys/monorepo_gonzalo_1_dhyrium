import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import OnlinePresenceService from '@/services/onlinePresence.services';

const user = (id: number, overrides = {}) => ({
  userId: id,
  fullName: `Usuario ${id}`,
  email: `usuario${id}@quisvar.test`,
  dni: `0000000${id}`,
  roleName: id === 1 ? 'Admin' : 'Tecnico',
  offices: id === 1 ? ['Sistemas'] : ['Tecnica'],
  ...overrides,
});

const connection = (
  socketId: string,
  connectedAt = new Date('2026-06-30T10:00:00.000Z'),
  rooms = ['1']
) => ({
  socketId,
  connectedAt,
  rooms,
  ip: '127.0.0.1',
  userAgent: 'node-test',
});

describe('OnlinePresenceService', () => {
  afterEach(() => {
    OnlinePresenceService.clear();
  });

  it('registra una conexion', () => {
    OnlinePresenceService.registerConnection(user(1), connection('socket-1'));

    const snapshot = OnlinePresenceService.getSnapshot();

    assert.equal(snapshot.summary.totalUsers, 1);
    assert.equal(snapshot.summary.totalConnections, 1);
    assert.equal(snapshot.data[0].userId, 1);
    assert.deepEqual(snapshot.data[0].socketIds, ['socket-1']);
  });

  it('agrupa multiples sockets del mismo usuario', () => {
    OnlinePresenceService.registerConnection(user(1), connection('socket-1'));
    OnlinePresenceService.registerConnection(
      user(1),
      connection('socket-2', new Date('2026-06-30T10:05:00.000Z'))
    );

    const snapshot = OnlinePresenceService.getSnapshot();

    assert.equal(snapshot.summary.totalUsers, 1);
    assert.equal(snapshot.summary.totalConnections, 2);
    assert.equal(snapshot.summary.usersWithMultipleConnections, 1);
    assert.equal(snapshot.data[0].connections, 2);
    assert.deepEqual(snapshot.data[0].socketIds, ['socket-1', 'socket-2']);
  });

  it('elimina una conexion sin borrar al usuario si quedan otras', () => {
    OnlinePresenceService.registerConnection(user(1), connection('socket-1'));
    OnlinePresenceService.registerConnection(user(1), connection('socket-2'));

    OnlinePresenceService.unregisterConnection(1, 'socket-1');
    const snapshot = OnlinePresenceService.getSnapshot();

    assert.equal(snapshot.summary.totalUsers, 1);
    assert.equal(snapshot.summary.totalConnections, 1);
    assert.deepEqual(snapshot.data[0].socketIds, ['socket-2']);
  });

  it('elimina al usuario cuando no quedan conexiones', () => {
    OnlinePresenceService.registerConnection(user(1), connection('socket-1'));

    OnlinePresenceService.unregisterConnection(1, 'socket-1');
    const snapshot = OnlinePresenceService.getSnapshot();

    assert.equal(snapshot.summary.totalUsers, 0);
    assert.equal(snapshot.summary.totalConnections, 0);
    assert.deepEqual(snapshot.data, []);
  });

  it('calcula totalUsers y totalConnections', () => {
    OnlinePresenceService.registerConnection(user(1), connection('socket-1'));
    OnlinePresenceService.registerConnection(user(2), connection('socket-2'));
    OnlinePresenceService.registerConnection(user(2), connection('socket-3'));

    const snapshot = OnlinePresenceService.getSnapshot();

    assert.equal(snapshot.summary.totalUsers, 2);
    assert.equal(snapshot.summary.totalConnections, 3);
    assert.equal(snapshot.summary.usersWithMultipleConnections, 1);
  });

  it('aplica filtros basicos', () => {
    OnlinePresenceService.registerConnection(
      user(1, {
        fullName: 'Ana Sistema',
        email: 'ana@quisvar.test',
        dni: '12345678',
        roleName: 'Administrador',
        offices: ['Sistemas'],
      }),
      connection('socket-1', new Date('2026-06-30T10:00:00.000Z'), [
        '1',
        'system-users',
      ])
    );
    OnlinePresenceService.registerConnection(
      user(2, {
        fullName: 'Luis Tecnico',
        email: 'luis@quisvar.test',
        dni: '87654321',
        roleName: 'Tecnico',
        offices: ['Oficina tecnica'],
      }),
      connection('socket-2')
    );
    OnlinePresenceService.registerConnection(user(2), connection('socket-3'));

    assert.equal(
      OnlinePresenceService.getSnapshot({ search: 'ana' }).meta.total,
      1
    );
    assert.equal(
      OnlinePresenceService.getSnapshot({ office: 'sistemas' }).data[0].userId,
      1
    );
    assert.equal(
      OnlinePresenceService.getSnapshot({ role: 'tecnico' }).data[0].userId,
      2
    );
    assert.equal(
      OnlinePresenceService.getSnapshot({ multiple: true }).data[0].userId,
      2
    );
    assert.equal(
      OnlinePresenceService.getSnapshot({ room: 'system-users' }).data[0]
        .userId,
      1
    );
    assert.equal(
      OnlinePresenceService.getSnapshot({ userId: 2 }).data[0].connections,
      2
    );
  });
});
