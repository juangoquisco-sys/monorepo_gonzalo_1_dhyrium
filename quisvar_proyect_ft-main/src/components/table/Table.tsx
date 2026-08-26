import {
  createContext,
  type ForwardedRef,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import './table.css';
import type { Table as ReactTable } from '@tanstack/react-table';

interface TableContextProps<T> {
  table: ReactTable<T>;
  rowSelect?: number;
}

export const TableContext = createContext({} as TableContextProps<any>);
interface TableProps<T> extends InputHTMLAttributes<HTMLDivElement> {
  table: ReactTable<T>;
  rowSelect?: number;
  children?: ReactNode;
  // ref?: LegacyRef<HTMLDivElement>;
}
const Table = <T,>(
  { table, children, rowSelect }: TableProps<T>,
  ref: ForwardedRef<HTMLDivElement>
) => {
  return (
    <TableContext.Provider
      value={{
        table,
        rowSelect,
      }}
    >
      <div className="tableWrap  scroll-slim" ref={ref} translate="no">
        <table className="table">{children}</table>
      </div>
    </TableContext.Provider>
  );
};

export default forwardRef(Table);
