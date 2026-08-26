import { Badge } from '@/components/ui/badge';

const getStatusVariant = (statusCode: number) => {
  if (statusCode >= 500) return 'danger';
  if (statusCode >= 400) return 'warning';
  if (statusCode >= 300) return 'info';
  if (statusCode >= 200) return 'success';
  return 'outline';
};

interface AuditStatusBadgeProps {
  statusCode: number;
}

export const AuditStatusBadge = ({ statusCode }: AuditStatusBadgeProps) => (
  <Badge variant={getStatusVariant(statusCode)}>{statusCode || 'N/D'}</Badge>
);
