import { Badge } from '@/components/ui/badge';
import type { AuditSeverity } from '../models/auditLogs.types';

const severityConfig: Record<
  AuditSeverity,
  { label: string; variant: 'outline' | 'success' | 'warning' | 'danger' }
> = {
  INFO: { label: 'Info', variant: 'outline' },
  SUCCESS: { label: 'Exito', variant: 'success' },
  WARNING: { label: 'Alerta', variant: 'warning' },
  ERROR: { label: 'Error', variant: 'danger' },
  CRITICAL: { label: 'Critico', variant: 'danger' },
};

interface AuditSeverityBadgeProps {
  severity: string;
}

export const AuditSeverityBadge = ({ severity }: AuditSeverityBadgeProps) => {
  const config = severityConfig[severity as AuditSeverity] || {
    label: severity || 'Info',
    variant: 'outline' as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
