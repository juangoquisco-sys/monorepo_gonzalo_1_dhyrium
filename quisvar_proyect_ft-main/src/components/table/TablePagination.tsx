import type { Table } from '@tanstack/react-table';
import type { PaginationTable } from '@/types/types';

interface TablePaginationProps<T> {
  table: Table<T>;
  isLoading?: boolean;
  pagination: PaginationTable;
  total: number;
}
const TablePagination = <T,>({
  table,
  pagination,
  total,
  isLoading,
}: TablePaginationProps<T>) => {
  return (
    <div className="tableMail-pagination-container">
      <div className="tableMail-pagination">
        <button
          className="tableMail-pagination-btn"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          className="tableMail-pagination-btn"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button
          className="tableMail-pagination-btn"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          className="tableMail-pagination-btn"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <span className="tableMail-pagination-text">
          Pagina
          <strong>
            {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount().toLocaleString()}{' '}
          </strong>
        </span>
        <span>| </span>
        <span className="tableMail-pagination-text">
          Ir a la pagina:
          <input
            type="number"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onBlur={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="tableMail-pagination-input"
          />
        </span>
        <span>
          <strong>{isLoading && 'Sincronizando...'}</strong>
        </span>
      </div>
      <div className="tableMail-pagination-more-info">
        <select
          value={pagination.pageSize}
          onChange={e => {
            table.setPageSize(Number(e.target.value));
          }}
          className="tableMail-pagination-select"
        >
          {[10, 20, 30, 40, 50, 100, 200].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>

        <p>
          Ver {table.getRowModel().rows.length.toLocaleString()} de {total}{' '}
          filas
        </p>
      </div>
    </div>
  );
};

export default TablePagination;
