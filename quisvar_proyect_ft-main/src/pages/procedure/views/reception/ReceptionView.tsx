import './receptionView.css';
import type { TypeProcedure } from '../../models/types';
import { axiosInstance } from '@/services/axiosInstance';
import { useNavigate } from 'react-router-dom';
import {
  MessageStatus,
  TYPE_PROCEDURE,
} from '../../models/definitionsMail.models';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getFullName } from '@/utils/tools';
import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import Button from '@/components/button/Button';
import IndeterminateCheckbox from '@/components/indeterminateCheckbox/IndeterminateCheckbox';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import TableMail from '../../components/tableMail/TableMail';
import LabelStatus from '../../components/labelStatus/LabelStatus';
import SubjectCell from '../../components/messageCell/SubjectCell';
import SubmitterCell from '../../components/messageCell/SubmitterCell';
import type { MessageType, PaginationTable } from '@/types/types';
import { IoCheckmarkSharp } from 'react-icons/io5';
import { LuEye } from 'react-icons/lu';
interface ReceptionViewProps {
  searchParams: URLSearchParams;
  type: TypeProcedure;
  onSave: () => void;
  receptionMail?: MessageType[];
  totalMail?: number;
  getMessagesPagination?: (data: PaginationTable) => void;
  isLoading: boolean;
  idSelect?: string;
}
const ReceptionView = ({
  onSave,
  type,
  searchParams,
  receptionMail,
  totalMail,
  isLoading,
  getMessagesPagination,
  idSelect,
}: ReceptionViewProps) => {
  const navigate = useNavigate();

  const [selectData, setSelectData] = useState<MessageType[] | null>(null);

  const handleViewMessage = (id: number) => {
    navigate(`${id}?${searchParams}`, { state: { isReception: true } });
  };
  const columnHelper = createColumnHelper<MessageType>();

  const columnPagination = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <IndeterminateCheckbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox
          key={row.original.id}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          indeterminate={row.getIsSomeSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
  ];

  const columns = [
    ...(!(searchParams.get('onHolding') === 'true') ? [] : columnPagination),

    columnHelper.accessor(
      ({ createdAt, userInit }) => ({
        user: userInit.user,
        createdAt,
      }),
      {
        header: 'Tramitante',
        cell: ({ getValue }) => <SubmitterCell value={getValue()} />,
      }
    ),

    columnHelper.accessor(({ header, title }) => ({ header, title }), {
      header: 'Asunto',
      cell: ({ getValue }) => <SubjectCell value={getValue()} />,
    }),

    ...(searchParams.get('onHolding') === 'false'
      ? [
          columnHelper.accessor('beforeOffice', {
            id: 'office-sender',
            header: 'Dependencia previa',
            cell: ({ getValue, row: { original } }) => {
              const userReceiver = original.users.find(
                user => user.type === 'SENDER'
              )?.user;
              return getValue() || getFullName(userReceiver);
            },
          }),
          columnHelper.accessor('office', {
            id: 'office-receiver',
            header: 'Dependencia actual',
            cell: ({ getValue, row: { original } }) => {
              const userReceiver = original.users.find(
                user => user.type === 'RECEIVER'
              )?.user;
              return getValue()?.name || getFullName(userReceiver);
            },
          }),
        ]
      : []),
    columnHelper.accessor('status', {
      header: () => 'Estado',
      cell: ({ getValue, row: { original } }) => (
        <LabelStatus
          status={original.onHolding ? 'EN_ESPERA' : MessageStatus[getValue()]}
        />
      ),
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Ultima modificación',
      cell: ({ getValue }) => formatDayDateTimeUtc(getValue()),
    }),
    columnHelper.accessor('id', {
      header: 'Visualizar',

      cell: ({ getValue }) => (
        <Button
          text="Ver"
          onClick={() => handleViewMessage(getValue())}
          position="center"
          leftIcon={<LuEye size={14} />}
          variant="outline"
          size="xxs"
        />
      ),
    }),
  ];

  const handleSelect = (typeSelect: 'holding' | 'decline') => {
    if (!selectData) return;

    const fn: Record<'holding' | 'decline', () => void> = {
      holding: () => SnackbarUtilities.success('Tramite aprobado exitosamente'),
      decline: () => SnackbarUtilities.success('Tramite rechazado'),
    };
    const ids = selectData.map(el => el.id);
    const body = { ids };
    axiosInstance
      .put(`${TYPE_PROCEDURE[type].provied}/${typeSelect}`, body)
      .then(() => {
        fn[typeSelect]();
        setSelectData([]);
        onSave();
      });
  };

  return (
    <>
      <div className="mail-options">
        {selectData && selectData.length > 0 && (
          <Button
            variant="ghost"
            leftIcon={<IoCheckmarkSharp size={21} />}
            color="success"
            text="Aprobar"
            onClick={() => handleSelect('holding')}
            style={{
              gap: '0.2rem',
            }}
          />
        )}
      </div>
      <TableMail
        data={receptionMail}
        total={totalMail}
        columns={columns}
        rowSelectionData={
          searchParams.get('onHolding') === 'true' ? setSelectData : null
        }
        getPagination={getMessagesPagination}
        isLoading={isLoading}
        idSelect={idSelect}
      />
    </>
  );
};

export default ReceptionView;
