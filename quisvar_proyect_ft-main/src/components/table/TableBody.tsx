import { type CSSProperties, useContext } from 'react';
import { TableContext } from './Table';
import './table.css';
import TableTr from './TableTr';
import type { Row } from '@tanstack/react-table';

interface TableBodyProps<T> {
  rowBackgroundColor?: (row: Row<T>) => string | undefined;
  rowStyle?: (row: Row<T>) => CSSProperties | undefined;
}
const TableBody = <T,>({ rowBackgroundColor, rowStyle }: TableBodyProps<T>) => {
  const { table } = useContext(TableContext);

  return (
    <tbody>
      {table.getRowModel().rows.map(row => (
        <TableTr
          row={row}
          key={row.id}
          backgroundColor={rowBackgroundColor?.(row)}
          rowStyle={rowStyle?.(row)}
        />
      ))}
    </tbody>
  );
};

export default TableBody;
