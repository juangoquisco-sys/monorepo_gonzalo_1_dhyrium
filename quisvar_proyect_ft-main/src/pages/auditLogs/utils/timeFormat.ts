import type { AuditTimeUnit } from '../models/auditLogs.types';

const numberFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const formatAuditDuration = (
  milliseconds: number | null | undefined,
  unit: AuditTimeUnit
) => {
  const value = milliseconds || 0;
  if (unit === 's') return `${decimalFormatter.format(value / 1000)} s`;
  if (unit === 'min') return `${decimalFormatter.format(value / 60000)} min`;
  return `${numberFormatter.format(value)} ms`;
};

export const formatAuditDurationMs = (
  milliseconds: number | null | undefined
) => `${numberFormatter.format(milliseconds || 0)} ms`;
