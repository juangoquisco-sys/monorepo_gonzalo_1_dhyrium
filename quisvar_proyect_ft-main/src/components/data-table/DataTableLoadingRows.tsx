import type { Table as ReactTable } from '@tanstack/react-table';
import { TableCell, TableRow } from '../ui/table';

interface DataTableLoadingRowsProps<TData> {
  table: ReactTable<TData>;
  rowCount: number;
}

export function DataTableLoadingRows<TData>({
  table,
  rowCount,
}: DataTableLoadingRowsProps<TData>) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {table.getVisibleLeafColumns().map(column => (
            <TableCell key={column.id}>
              <div className="h-5 animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
