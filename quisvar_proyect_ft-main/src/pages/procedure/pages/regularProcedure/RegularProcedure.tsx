import './regularProcedure.css';
import FloatingText from '@/components/floatingText/FloatingText';
import IconAction from '@/components/iconAction/IconAction';
import IndeterminateCheckbox from '@/components/indeterminateCheckbox/IndeterminateCheckbox';
import CardRegisterProcedureGeneral from '../../views/cardRegisterProcedureGeneral/CardRegisterProcedureGeneral';
import ReceptionView from '../../views/reception/ReceptionView';
import HeaderProcedure from '../../components/headerProcedure/HeaderProcedure';
import LabelStatus from '../../components/labelStatus/LabelStatus';
import { Outlet, useParams } from 'react-router-dom';
import { useState } from 'react';
import useNavigateWithParams from '@/hooks/useNavigateWithParams';
import useRole from '@/hooks/useRole';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getFullName } from '@/utils/tools';
import useRegularMail from './hooks/useRegularMail';
import TableMail from '../../components/tableMail/TableMail';
import { createColumnHelper } from '@tanstack/react-table';
import type { MessageType } from '@/types/types';
import { formatDateTimeUtc } from '@/utils/dayjsSpanish';
import { MessageStatus } from '../../models/definitionsMail.models';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { OutletContextRegularProcedure } from './interfaces/regularProcedure.types';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';

const RegularProcedure = () => {
  const [isNewMessage, setIsNewMessage] = useState(false);
  const { messageId } = useParams();
  const { isAccessReception } = useSelector(
    (state: RootState) => state.userSession
  );
  const navigateWithParams = useNavigateWithParams();

  const { hasAccess } = useRole('MOD', 'tramites', 'tramite-regular');

  const {
    getMessagesPagination,
    handleSelectOption,
    regularMailQuery,
    query,
    searchParams,
  } = useRegularMail();

  const handleMessage = () => setIsNewMessage(!isNewMessage);

  const [selectData, setSelectData] = useState<MessageType[] | null>(null);

  // const { optionsMailHeader, typeMail } = useSelectReceiver();
  const optionsMailHeader = [
    {
      id: 1,
      iconOn: 'inbox',
      iconOff: 'inbox-black',
      text: 'RECIBIDOS',
      isActive: query.typeMail === 'RECEIVER',
      funcion: () => handleSelectOption('RECEIVER'),
    },
    {
      id: 2,
      iconOn: 'tabler',
      iconOff: 'tabler-black',
      text: 'ENVIADOS',
      isActive: query.typeMail === 'SENDER',
      funcion: () => handleSelectOption('SENDER'),
    },
    {
      id: 3,
      iconOn: 'archiver-box',
      iconOff: 'archiver-box-black',
      text: 'ARCHIVADOS',
      isActive: query.status === 'ARCHIVADO',
      funcion: () => handleSelectOption('ARCHIVER'),
    },
    ...(isAccessReception
      ? [
          {
            id: 4,
            iconOn: 'desk-filled',
            iconOff: 'desk-regular',
            text: 'MESA DE PARTES',
            isActive: query.typeMail === 'RECEPTION',
            funcion: () => handleSelectOption('RECEPTION'),
          },
        ]
      : []),
  ];

  const handleSaveMessage = () => {
    regularMailQuery.refetch();
    handleMessage();
  };

  const handleArchive = () => {
    if (!selectData) return;
    const ids = selectData.map(el => el.id);
    const body = { ids };
    axiosInstance.patch(`mail/archived/list`, body).then(() => {
      SnackbarUtilities.success('Tramite archivado.');
      regularMailQuery.refetch();
    });
  };

  const handleViewMessage = (id: number) => {
    setIsNewMessage(false);
    navigateWithParams(`${id}`);
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
    columnHelper.accessor('title', {
      header: () => 'Documento',
    }),
    ...(query.typeMail !== 'SENDER'
      ? [
          columnHelper.accessor(
            ({ users }) =>
              users.find(user => user.type === 'SENDER' && user.role === 'MAIN')
                ?.user,
            {
              id: 'sender',
              cell: ({ getValue, row: { original } }) =>
                original.beforeOffice || getFullName(getValue()),
              header: () => 'Remitente',
            }
          ),
        ]
      : []),
    ...(query.typeMail !== 'RECEIVER'
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
    columnHelper.accessor('header', {
      header: () => 'Asunto',
      cell: ({ getValue }) => (
        <FloatingText text={getValue()} yPos={10}>
          <div className="text-ellipsis">{getValue()}</div>
        </FloatingText>
      ),
    }),
    columnHelper.accessor('status', {
      header: () => 'Estado',
      cell: ({ getValue, row: { original } }) => (
        <LabelStatus
          status={original.onHolding ? 'EN_ESPERA' : MessageStatus[getValue()]}
        />
      ),
    }),
    columnHelper.accessor(({ userInit }) => userInit?.user, {
      header: 'Tramitante',
      cell: ({ getValue }) => getFullName(getValue()),
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Ultima modificación',
      cell: ({ getValue }) => formatDateTimeUtc(getValue()),
    }),
    columnHelper.accessor('id', {
      header: 'Visualizar',

      cell: ({ getValue }) => (
        <i
          onClick={() => handleViewMessage(getValue())}
          className="tableMail-archiver"
        >
          <IconAction icon="eye" position="none" />
          Ver
        </i>
      ),
    }),
  ];

  const outletContex: OutletContextRegularProcedure = {
    reloadMessages: () => regularMailQuery.refetch(),
    officeId: query.office,
  };

  return (
    <>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={isNewMessage || messageId ? 60 : 100} order={1}>
          <div className="mail-main-master-container">
            <HeaderProcedure
              handleNewMessage={handleMessage}
              optionsMailHeader={optionsMailHeader}
              refresh={regularMailQuery.refetch}
              query={query}
            />
            {query.typeMail !== 'RECEPTION' ? (
              <>
                <div className="mail-options">
                  {selectData && selectData?.length > 0 && (
                    <IconAction
                      icon="bx_cabinet"
                      text="Archivar"
                      onClick={handleArchive}
                    />
                  )}
                </div>
                <TableMail
                  key={query.typeMail}
                  data={regularMailQuery.data?.listMessage as MessageType[]}
                  total={regularMailQuery.data?.total}
                  columns={columns}
                  rowSelectionData={
                    query.typeMail === 'ARCHIVER' ? null : setSelectData
                  }
                  getPagination={getMessagesPagination}
                  isLoading={regularMailQuery.isFetching}
                />
              </>
            ) : (
              <ReceptionView
                type="regularProcedure"
                totalMail={regularMailQuery.data?.total}
                searchParams={searchParams}
                onSave={regularMailQuery.refetch}
                receptionMail={
                  regularMailQuery.data?.listMessage as MessageType[]
                }
                getMessagesPagination={getMessagesPagination}
                isLoading={regularMailQuery.isFetching}
              />
            )}
          </div>
        </Panel>
        <PanelResizeHandle className="resizable" />
        {!isNewMessage && messageId && (
          <Panel defaultSize={40} order={2}>
            <Outlet context={outletContex} />
          </Panel>
        )}

        {isNewMessage && (
          <Panel defaultSize={40} order={2}>
            <CardRegisterProcedureGeneral
              onClosing={handleMessage}
              onSave={handleSaveMessage}
              type={'regularProcedure'}
            />
          </Panel>
        )}
      </PanelGroup>
    </>
  );
};

export default RegularProcedure;
