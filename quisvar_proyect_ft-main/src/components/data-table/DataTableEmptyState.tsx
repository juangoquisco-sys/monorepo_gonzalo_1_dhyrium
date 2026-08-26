import type { ReactNode } from 'react';
import type { Table as ReactTable } from '@tanstack/react-table';
import { TableCell, TableRow } from '../ui/table';
import { cn } from '@/lib/utils';

interface DataTableEmptyStateProps<TData> {
  table: ReactTable<TData>;
  children: ReactNode;
  className?: string;
}

export function DataTableEmptyState<TData>({
  table,
  children,
  className,
}: DataTableEmptyStateProps<TData>) {
  return (
    <TableRow>
      <TableCell colSpan={table.getVisibleLeafColumns().length}>
        <div
          className={cn(
            'flex min-h-40 items-center justify-center text-sm text-muted-foreground',
            className
          )}
        >
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}
