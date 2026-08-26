import { flexRender } from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';
import { TableContext } from './Table';
import { type CSSProperties, useContext, useState } from 'react';
import { stickyStyle } from './utils';

interface TableTrProps<T extends { id: number }> {
  row: Row<T>;
  backgroundColor?: CSSProperties['backgroundColor'];
  className?: string;
  rowStyle?: CSSProperties;
}
type StickyColumnMeta = {
  sticky?: 'left' | 'right';
  stickyOffset?: CSSProperties['left'] | CSSProperties['right'];
};
const TableTr = <T extends { id: number }>({
  row,
  backgroundColor,
  className,
  rowStyle,
}: TableTrProps<T>) => {
  const { rowSelect } = useContext(TableContext);
  const [onHovering, setOnHovering] = useState(false);

  const rowStyleContainer: CSSProperties = {
    backgroundColor: onHovering
      ? 'var(--color-includeLvl)'
      : backgroundColor ||
        (+(rowSelect ?? 0) === row.original.id
          ? 'var(--color-includeLvl)'
          : 'var(--color-menu)'),
    ...rowStyle,
  };

  return (
    <tr
      key={row.id}
      className={`table-body-row ${className}`}
      style={rowStyleContainer}
      onMouseEnter={() => setOnHovering(true)}
      onMouseLeave={() => setOnHovering(false)}
    >
      {row.getVisibleCells().map(cell => {
        const meta = cell.column.columnDef?.meta as
          | StickyColumnMeta
          | undefined;
        return (
          <td
            key={cell.id}
            className={`table-body-item ${meta?.sticky ? 'sticky-td' : ''}`}
            style={{
              ...stickyStyle(meta?.sticky, meta?.stickyOffset),
              ...(meta?.sticky && {
                backgroundColor: rowStyleContainer.backgroundColor,
              }),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
};

export default TableTr;
