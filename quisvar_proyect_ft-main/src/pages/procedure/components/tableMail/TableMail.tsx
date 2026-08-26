import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import './tableMail.css';
import { useEffect, useState } from 'react';
import type { PaginationTable } from '@/types/types';
import { useSearchParams } from 'react-router-dom';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Table from '@/components/table/Table';
import TableBody from '@/components/table/TableBody';
import TableHead from '@/components/table/TableHead';
import TableNoData from '@/components/table/TableNoData';
import TablePagination from '@/components/table/TablePagination';

interface objectTable {
  id: number;
}

interface TableMailProps<T extends objectTable> {
  data?: T[] | null;
  total?: number;
  columns: ColumnDef<T, any>[];
  rowSelectionData?: ((data: T[]) => void) | null;
  isLoading?: boolean;
  getPagination?: (pagination: PaginationTable) => void;
  idSelect?: string;
  viewPagination?: boolean;
}

function tableMail<T extends objectTable>({
  data,
  columns,
  rowSelectionData,
  isLoading,
  total = 0,
  getPagination,
  idSelect,
  viewPagination = true,
}: TableMailProps<T>) {
  const [searchParams] = useSearchParams();
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: +(searchParams.get('page') ?? 0),
    pageSize: +(searchParams.get('limit') ?? 50),
  });

  // const firstRender = useRef(true);

  useEffect(() => {
    // if (firstRender.current) {
    //   firstRender.current = false;
    // } else {
    getPagination?.(pagination);
    // }
  }, [pagination]);

  const getRowId = (originalRow: T) => originalRow.id.toString();

  const table = useReactTable({
    data: data ?? [],
    columns,
    rowCount: total,
    state: {
      pagination,
      rowSelection,
    },
    getRowId,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    debugTable: true,
  });

  useEffect(() => {
    if (!rowSelectionData) return;
    const dataSelection: T[] = table
      .getSelectedRowModel()
      .flatRows.map(({ original }) => original);
    rowSelectionData(dataSelection);
  }, [rowSelection]);

  return (
    <>
      <div className="table-container">
        {data ? (
          data.length ? (
            <Table table={table} rowSelect={Number(idSelect)}>
              <TableHead />
              <TableBody />
            </Table>
          ) : (
            <TableNoData />
          )
        ) : (
          <LoaderForComponent />
        )}
      </div>
      {viewPagination && (
        <TablePagination
          isLoading={isLoading}
          table={table}
          total={total}
          pagination={pagination}
        />
      )}
    </>
  );
}

export default tableMail;
