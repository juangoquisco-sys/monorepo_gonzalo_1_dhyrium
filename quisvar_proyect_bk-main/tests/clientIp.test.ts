import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { normalizeClientIp, resolveClientIp } from '@/utils/clientIp';

describe('client IP resolver', () => {
  const originalIgnoredClientIps = process.env.IGNORED_CLIENT_IPS;

  afterEach(() => {
    if (originalIgnoredClientIps === undefined) {
      delete process.env.IGNORED_CLIENT_IPS;
    } else {
      process.env.IGNORED_CLIENT_IPS = originalIgnoredClientIps;
    }
  });

  it('normaliza IPv6-mapped IPv4 y puertos IPv4', () => {
    assert.equal(normalizeClientIp('::ffff:192.168.1.25'), '192.168.1.25');
    assert.equal(normalizeClientIp('192.168.1.25:51234'), '192.168.1.25');
    assert.equal(normalizeClientIp('[2001:db8::1]:443'), '2001:db8::1');
  });

  it('usa el primer valor util de X-Forwarded-For', () => {
    const result = resolveClientIp({
      headers: {
        'x-forwarded-for': '172.22.0.1, 172.16.10.45',
        'x-real-ip': '172.22.0.1',
      },
      ip: '172.22.0.1',
      remoteAddress: '172.22.0.1',
    });

    assert.equal(result.ip, '172.16.10.45');
    assert.equal(result.source, 'x-forwarded-for');
    assert.deepEqual(result.ignored, ['172.22.0.1']);
  });

  it('conserva IPs privadas de intranet que no son gateways Docker conocidos', () => {
    const result = resolveClientIp({
      headers: {},
      ip: '172.16.10.25',
      remoteAddress: '172.16.10.25',
    });

    assert.equal(result.ip, '172.16.10.25');
    assert.equal(result.source, 'req.ip');
  });

  it('omite IPs configuradas como no utiles', () => {
    process.env.IGNORED_CLIENT_IPS = '10.8.0.1';

    const result = resolveClientIp({
      headers: { 'x-real-ip': '10.8.0.1' },
      ip: '192.168.1.44',
    });

    assert.equal(result.ip, '192.168.1.44');
    assert.deepEqual(result.ignored, ['10.8.0.1']);
  });

  it('no devuelve el gateway Docker cuando no hay otra IP disponible', () => {
    const result = resolveClientIp({
      headers: { 'x-forwarded-for': '172.22.0.1' },
      ip: '172.22.0.1',
      remoteAddress: '172.22.0.1',
    });

    assert.equal(result.ip, '');
    assert.equal(result.source, null);
    assert.deepEqual(result.ignored, ['172.22.0.1']);
  });
});
