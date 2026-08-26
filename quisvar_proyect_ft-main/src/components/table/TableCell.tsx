import type { CellContext } from '@tanstack/react-table';
import { type ReactNode, useEffect, useState } from 'react';

interface TableCellProps<T, G> {
  item: CellContext<T, G>;
  children: (value: G, handleChange: (value: G) => void) => ReactNode;
}

const TableCell = <T, G>({ item, children }: TableCellProps<T, G>) => {
  const { getValue, row, column, table } = item;
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (value: G) => {
    setValue(value);
    table.options.meta?.updateData(row.index, column.id, value);
  };

  return children(value, handleChange);
};

export default TableCell;
