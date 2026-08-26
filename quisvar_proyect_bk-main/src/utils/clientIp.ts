import type { Request } from 'express';

type HeaderValue = string | string[] | undefined;

interface ClientIpContext {
  headers?: Record<string, HeaderValue>;
  ip?: string | null;
  remoteAddress?: string | null;
}

export interface ClientIpResolution {
  ip: string;
  source: string | null;
  candidates: string[];
  ignored: string[];
}

const DEFAULT_IGNORED_CLIENT_IPS = [
  '127.0.0.1',
  '::1',
  '172.17.0.1',
  '172.22.0.1',
];

const splitCsv = (value?: string) =>
  value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean) || [];

const firstHeaderValue = (value: HeaderValue) => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const getHeader = (
  headers: Record<string, HeaderValue> | undefined,
  name: string
) => {
  if (!headers) return '';
  const direct = headers[name];
  if (direct !== undefined) return firstHeaderValue(direct);

  const lowerName = name.toLowerCase();
  const key = Object.keys(headers).find(
    headerName => headerName.toLowerCase() === lowerName
  );
  return key ? firstHeaderValue(headers[key]) : '';
};

const stripIpv4Port = (value: string) => {
  const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  return match ? match[1] : value;
};

export const normalizeClientIp = (value?: string | null) => {
  if (!value) return '';

  let ip = value.trim();
  if (!ip || ip.toLowerCase() === 'unknown') return '';

  if (ip.startsWith('"') && ip.endsWith('"')) {
    ip = ip.slice(1, -1).trim();
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }

  if (ip.startsWith('[')) {
    const closingBracketIndex = ip.indexOf(']');
    if (closingBracketIndex > 0) {
      ip = ip.slice(1, closingBracketIndex);
    }
  }

  return stripIpv4Port(ip);
};

const getIgnoredClientIps = () => {
  const configured = splitCsv(process.env.IGNORED_CLIENT_IPS);
  return new Set(
    [...DEFAULT_IGNORED_CLIENT_IPS, ...configured]
      .map(normalizeClientIp)
      .filter(Boolean)
  );
};

const candidate = (source: string, value?: string | null) => {
  const ip = normalizeClientIp(value);
  return ip ? { source, ip } : null;
};

export const resolveClientIp = (
  context: ClientIpContext
): ClientIpResolution => {
  const ignoredIps = getIgnoredClientIps();
  const candidates = [
    ...splitCsv(getHeader(context.headers, 'x-forwarded-for')).map(value =>
      candidate('x-forwarded-for', value)
    ),
    candidate('x-real-ip', getHeader(context.headers, 'x-real-ip')),
    candidate('req.ip', context.ip),
    candidate('remoteAddress', context.remoteAddress),
  ].filter((item): item is { source: string; ip: string } => Boolean(item));

  const ignored: string[] = [];
  for (const item of candidates) {
    if (ignoredIps.has(item.ip)) {
      if (!ignored.includes(item.ip)) ignored.push(item.ip);
      continue;
    }

    return {
      ip: item.ip,
      source: item.source,
      candidates: candidates.map(candidateItem => candidateItem.ip),
      ignored,
    };
  }

  return {
    ip: '',
    source: null,
    candidates: candidates.map(candidateItem => candidateItem.ip),
    ignored,
  };
};

export const getRequestClientIp = (req: Request) =>
  resolveClientIp({
    headers: req.headers as Record<string, HeaderValue>,
    ip: req.ip,
    remoteAddress: req.socket.remoteAddress,
  }).ip;
