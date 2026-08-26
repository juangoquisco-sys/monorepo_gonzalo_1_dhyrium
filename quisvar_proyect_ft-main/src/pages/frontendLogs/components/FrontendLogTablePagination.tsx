import { ChevronLeft, ChevronRight, ChevronsLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FrontendLogsMeta } from '../models';

const pageSizeOptions = [10, 25, 50, 100];

const formatSnapshot = (value?: string) => {
  if (!value) return 'Creando vista...';
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface FrontendLogTablePaginationProps {
  meta?: FrontendLogsMeta;
  isFetching: boolean;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (limit: number) => void;
}

export const FrontendLogTablePagination = ({
  meta,
  isFetching,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
}: FrontendLogTablePaginationProps) => {
  const pageSize = meta?.limit || 25;
  const hasPrevPage = Boolean(meta?.hasPrevPage);
  const hasNextPage = Boolean(meta?.hasNextPage);

  return (
    <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={String(pageSize)}
          disabled={isFetching}
          onValueChange={value => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map(option => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm font-medium text-foreground">
          Filas por vista
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          Vista fijada: {formatSnapshot(meta?.snapshotAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isFetching || !hasPrevPage}
          onClick={onFirstPage}
        >
          <ChevronsLeft className="size-4" />
          Primera
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isFetching || !hasPrevPage}
          onClick={onPreviousPage}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isFetching || !hasNextPage}
          onClick={onNextPage}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};
