import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/button/Button';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import Table from '@/components/table/Table';
import TableHead from '@/components/table/TableHead';
import TableTr from '@/components/table/TableTr';
import SelectPeriod from '@/components/selectPeriod/SelectPeriod';
import './attendanceTable.css';
import { BsCalendar2Week } from 'react-icons/bs';
import { COLOR_CSS } from '@/utils/cssData';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { axiosInstance } from '@/services/axiosInstance';
import type { UserAttendance } from '@/types/types';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';

interface AttendanceTableProps {
  className?: string;
  editValues?: boolean;
  onCloseTable?: () => void;
  userId: number;
}

type TDate = Date | null;
interface AttendanceType {
  assignedAt: Date;
  status: keyof UserAttendance;
  list: {
    timer: string;
    title: string;
  };
}
const AttendanceTable = ({
  className,
  onCloseTable,
  userId,
}: AttendanceTableProps) => {
  const [attendanceData, setAttendanceData] = useState<AttendanceType[]>([]);
  const [licenseData, setLicenseData] = useState<any[]>([]);
  const [isAttendance, setIsAttendance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [[startDate, endDate], setDateRange] = useState<[TDate, TDate]>([
    null,
    null,
  ]);

  const params =
    startDate && endDate
      ? new URLSearchParams({
          initialDate: startDate.toISOString(),
          untilDate: endDate.toISOString(),
        })
      : undefined;

  const handleGetAttendance = useCallback(async () => {
    if (startDate && endDate) {
      setIsLoading(true);

      const response = await axiosInstance.get(
        `/list/attendance-user/${userId}?mods=true`,
        {
          params,
          headers: { noLoader: true },
        }
      );
      setAttendanceData(response.data);
      setIsAttendance(true);
      setIsLoading(false);
    } else {
      setAttendanceData([]);
    }
  }, [startDate, endDate]);

  const handleGetLicenses = useCallback(async () => {
    if (startDate && endDate) {
      setIsLoading(true);

      const response = await axiosInstance.get(
        `/license/licenses-user/${userId}?mods=true`,
        {
          params,
          headers: { noLoader: true },
        }
      );
      setIsAttendance(false);
      setLicenseData(response.data);
      setIsLoading(false);
    } else {
      setLicenseData([]);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (isAttendance) {
      handleGetAttendance();
    } else {
      handleGetLicenses();
    }
  }, [handleGetLicenses, handleGetAttendance]);

  //   useEffect(() => {
  //     handleGetAttendance();
  //   }, [handleGetAttendance]);

  const onSetRangeDate = (dates: [Date | null, Date | null]) => {
    setDateRange(dates);
  };

  const columnHelper = createColumnHelper<any>();

  const columns = [
    columnHelper.accessor('assignedAt', {
      header: 'Hora y Fecha',
      cell: info => formatDayDateTimeUtc(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Incidencia',
      cell: ({ getValue }) => (
        <span
          className={`attendanceTable-content attendanceTable-status-${getValue()}`}
        >
          {getValue()}
        </span>
      ),
    }),
  ];

  const columns2 = [
    columnHelper.accessor('createdAt', {
      header: 'Hora y Fecha',
      cell: info => formatDayDateTimeUtc(info.getValue()),
    }),
    columnHelper.accessor('startDate', {
      header: 'Salida',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('checkout', {
      header: 'Retorno',
      cell: info => info.getValue(),
    }),
  ];

  const table = useReactTable({
    data: attendanceData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const table2 = useReactTable({
    data: licenseData,
    columns: columns2,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={`${className} attendanceTable`}
      style={{ cursor: isLoading ? 'progress' : 'default' }}
    >
      <Button
        icon="close"
        className="attendanceTable-closebtn"
        iconSize={1}
        color="transparent"
        onClick={onCloseTable}
      />
      <h3 className="attendanceTable">
        Registro de incidencias en asistencias
      </h3>
      <div className="reportPersonalTaskView-btns">
        <Button
          text="Tardanzas y Faltas"
          size="xxs"
          color="grayLigth"
          textColor="secondary"
          borderRadius={16}
          onClick={handleGetAttendance}
        />
        <Button
          text="Permisos y Salidas"
          size="xxs"
          color="grayLigth"
          textColor="secondary"
          borderRadius={16}
          onClick={handleGetLicenses}
        />
      </div>
      <SelectPeriod onChange={onSetRangeDate} disabled={false} />
      <DatePickerCustom
        showIcon
        selectsRange
        startDate={startDate || undefined}
        endDate={endDate || undefined}
        onChange={onSetRangeDate}
        isClearable
        icon={<BsCalendar2Week size={15} color={COLOR_CSS.gray} />}
        placeholderText="Fecha inicio - Fecha fin"
        disabled={false}
      />
      {isAttendance ? (
        <Table table={table}>
          <TableHead />
          <tbody>
            {table.getRowModel().rows.map(row => (
              <TableTr
                key={row.id}
                row={row}
                rowStyle={{ backgroundColor: 'transparent' }}
              />
            ))}
          </tbody>
        </Table>
      ) : (
        <Table table={table2}>
          <TableHead />
          <tbody>
            {table2.getRowModel().rows.map(row => (
              <TableTr
                key={row.id}
                row={row}
                rowStyle={{ backgroundColor: 'transparent' }}
              />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AttendanceTable;
