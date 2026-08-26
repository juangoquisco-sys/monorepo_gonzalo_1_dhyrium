import { flexRender } from '@tanstack/react-table';
import { type CSSProperties, type ReactNode, useContext } from 'react';
import { TableContext } from './Table';
import './table.css';
import { stickyStyle } from './utils';
interface TableHeadProps {
  trUp?: ReactNode;
  trDown?: ReactNode;
  position?: CSSProperties['position'];
}
type StickyColumnMeta = {
  sticky?: 'left' | 'right';
  stickyOffset?: CSSProperties['left'] | CSSProperties['right'];
};
const TableHead = ({ trDown, trUp, position = 'sticky' }: TableHeadProps) => {
  const { table } = useContext(TableContext);
  const theadStyle: CSSProperties = {
    position,
  };
  return (
    <thead className="table-header" style={theadStyle}>
      {trUp}
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id} className="table-header-row">
          {headerGroup.headers.map(header => {
            const meta = header.column.columnDef?.meta as
              | StickyColumnMeta
              | undefined;
            return (
              <th
                key={header.id}
                className={`table-header-item ${
                  (header.column.getIndex() == 600 || meta?.sticky) &&
                  'sticky-th'
                }`}
                style={{
                  ...stickyStyle(meta?.sticky, meta?.stickyOffset),
                  ...(meta?.sticky && {
                    backgroundColor: 'var(--color-primarylight)',
                  }),
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            );
          })}
        </tr>
      ))}
      {trDown}
    </thead>
  );
};

export default TableHead;
