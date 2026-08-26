import type { RowData } from '@tanstack/react-table';
import type { CSSProperties } from 'react';
declare module 'react' {
  function forwardRef<T, P = {}>(
    render: (props: P, ref: Ref<T>) => ReactElement | null
  ): (props: P & RefAttributes<T>) => ReactElement | null;
}

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    editedRows: boolean;
  }
  interface ColumnMeta<TData, TValue> {
    sticky?: 'left' | 'right';
    stickyOffset?: CSSProperties['left'] | CSSProperties['right'];
  }
}
