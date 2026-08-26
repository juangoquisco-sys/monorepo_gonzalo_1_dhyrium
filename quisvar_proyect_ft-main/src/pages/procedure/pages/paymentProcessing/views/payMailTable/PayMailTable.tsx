import { useContext, useState } from 'react';
import type { MessageType } from '@/types/types';
import Button from '@/components/button/Button';
import IndeterminateCheckbox from '@/components/indeterminateCheckbox/IndeterminateCheckbox';
import { axiosInstance } from '@/services/axiosInstance';
import { getFullName } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import TableMail from '../../../../components/tableMail/TableMail';
import { createColumnHelper } from '@tanstack/react-table';
import LabelStatus from '../../../../components/labelStatus/LabelStatus';
import SubjectCell from '../../../../components/messageCell/SubjectCell';
import SubmitterCell from '../../../../components/messageCell/SubmitterCell';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import { MessageStatus } from '../../../../models/definitionsMail.models';
import { LuEye } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { MailPageContext } from '../../context/MailPageContext';
import { PiListPlus } from 'react-icons/pi';
import './payMailTable.css';
import { isOpenCardRegisterPayroll$ } from '@/services/sharingSubject';
import useRole from '@/hooks/useRole';
// import { MailPageContext } from '../../MailPage';

const PayMailTable = () => {
  const {
    query,
    payMailQuery,
    hasAccess,
    paymessageId,
    handleCloseMessage,
    getMessagesPagination,
    searchParams,
  } = useContext(MailPageContext);
  const [selectData, setSelectData] = useState<MessageType[] | null>(null);
  const navigate = useNavigate();

  const { hasAccess: payRollMod } = useRole(
    'MOD',
    'tramites',
    'tramite-de-pago'
  );

  const handleArchive = () => {
    const ids = selectData!.map(el => el.id);
    const body = { ids };
    axiosInstance.patch(`paymail/archived/list`, body).then(() => {
      SnackbarUtilities.success('Tramite archivado.');
      payMailQuery.refetch();
    });
  };
  const handleSelectForPayroll = () => {
    const ids = selectData!.filter(el => el.report.length > 0);
    console.log('asd', ids, selectData);
    if (ids.length < selectData!.length)
      return SnackbarUtilities.warning(
        'Asegurese de que los tramites tenga su respectivo reporte'
      );
    isOpenCardRegisterPayroll$.setSubject = {
      ids: ids.map(el => el.report.map(r => r.id)).flat(),
      isOpen: true,
    };
  };
  const handleViewMessage = (id: number) => {
    navigate({
      pathname: `${id}`,
      search: searchParams.toString(),
    });
    handleCloseMessage();
  };
  const columnHelper = createColumnHelper<MessageType>();
  const columns = [
    ...(hasAccess
      ? [
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
        ]
      : []),

    ...(query.office
      ? [
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
        ]
      : []),

    columnHelper.accessor(
      ({ header, title, report }) => ({ header, title, report }),
      {
        header: 'Asunto',
        cell: ({ getValue }) => (
          <SubjectCell
            value={{
              ...getValue(),
              subtitle:
                getValue().report.length > 0 && getValue().report[0].payrollId
                  ? '(con planilla)'
                  : '',
            }}
          />
        ),
      }
    ),

    ...(query.office
      ? [
          columnHelper.accessor(
            ({ users }) =>
              users.find(user => user.type === 'SENDER' && user.role === 'MAIN')
                ?.user,
            {
              id: 'sender',
              cell: ({ row: { original } }) =>
                original.beforeOffice || 'TRAMITANTE',
              header: () => 'Dependencia anterior',
            }
          ),
        ]
      : []),
    ...(!query.office
      ? [
          columnHelper.accessor(
            ({ users }) =>
              users.find(
                user => user.type === 'RECEIVER' && user.role === 'MAIN'
              )?.user,
            {
              id: 'receiver',
              cell: ({ getValue, row: { original } }) =>
                original.office?.name || getFullName(getValue()),
              header: () => 'Dependencia actual',
            }
          ),
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

  return (
    <>
      <div className="PayMailTable-options">
        {selectData && selectData?.length > 0 && (
          <>
            {payRollMod && !!query.office && (
              <Button
                text="Agregar a planilla"
                color="secondary"
                leftIcon={<PiListPlus size={18} />}
                variant="ghost"
                onClick={handleSelectForPayroll}
              />
            )}
            <Button
              text="Archivar"
              color="secondary"
              icon="bx_cabinet"
              variant="ghost"
              onClick={handleArchive}
            />
          </>
        )}
      </div>
      <TableMail
        key={query.typeMail}
        data={payMailQuery.data?.listMessage as MessageType[]}
        total={payMailQuery.data?.total}
        columns={columns}
        rowSelectionData={query.typeMail === 'ARCHIVER' ? null : setSelectData}
        getPagination={getMessagesPagination}
        isLoading={payMailQuery.isFetching}
        idSelect={paymessageId}
      />
    </>
  );
};

export default PayMailTable;
