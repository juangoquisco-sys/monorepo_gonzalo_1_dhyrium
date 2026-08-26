import Button from '@/components/button/Button';
import FloatingText from '@/components/floatingText/FloatingText';
import HeaderOptionBtn from '@/components/headerOption/HeaderOptionBtn';
import IconAction from '@/components/iconAction/IconAction';
import Select from '@/components/select/Select';
import './communications.css';
import useSelectReceiver from '../../hooks/useSelectReceiver';
import CardRegisterProcedureGeneral from '../../views/cardRegisterProcedureGeneral/CardRegisterProcedureGeneral';
import { Outlet, useParams } from 'react-router-dom';
import useNavigateWithParams from '@/hooks/useNavigateWithParams';
import useRole from '@/hooks/useRole';
import useComunication from './hooks/useComunication';
import { useState } from 'react';
import type { MessageType } from '@/types/types';
import TableMail from '../../components/tableMail/TableMail';
import { createColumnHelper } from '@tanstack/react-table';
import { getFullName } from '@/utils/tools';
import {
  getMessageTypeFilterId,
  listTypeMsg,
} from '@/utils/files/files.utils';
import { formatDateTimeUtc } from '@/utils/dayjsSpanish';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const Communications = () => {
  const navigateWithParams = useNavigateWithParams();
  const [isNewMessage, setIsNewMessage] = useState(false);
  const { messageId } = useParams();

  const handleMessage = () => setIsNewMessage(!isNewMessage);

  const {
    getMessagesPagination,
    comunicationQuery,
    handleFilter,
    typeMessage,
  } = useComunication();
  const { optionsMailHeader } = useSelectReceiver(['RECIBIDOS']);
  const { hasAccess } = useRole('MOD', 'tramites', 'comunicado');

  const columnHelper = createColumnHelper<MessageType>();
  const columns = [
    columnHelper.accessor('title', {
      header: () => 'Documento',
    }),
    columnHelper.accessor(
      ({ users }) => users.find(user => user.type === 'SENDER')?.user,
      {
        id: 'sender',
        cell: ({ getValue, row: { original } }) =>
          original.office?.name || getFullName(getValue()),
        header: () => 'Remitente',
        enableHiding: true,
      }
    ),

    columnHelper.accessor('header', {
      header: () => 'Asunto',
      cell: ({ getValue }) => (
        <FloatingText text={getValue()} yPos={10}>
          <div className="text-ellipsis">{getValue()}</div>
        </FloatingText>
      ),
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Fecha de envio',
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
  const handleViewMessage = (id: number) => {
    navigateWithParams(`${id}`);
  };
  const handleSaveMessage = () => {
    comunicationQuery.refetch();
    handleMessage();
  };
  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={isNewMessage ? 70 : 100} order={1}>
        <div className="mail-main-master-container">
          <div className="message-container-header">
            <div className="message-options-filter">
              <div className="message-header-option">
                {optionsMailHeader.map(
                  ({ funcion, id, iconOff, iconOn, text, isActive }) => (
                    <HeaderOptionBtn
                      key={id}
                      iconOff={iconOff}
                      iconOn={iconOn}
                      text={text}
                      isActive={isActive}
                      onClick={funcion}
                      width={10}
                    />
                  )
                )}
              </div>
              <div className="mail-main-options-container">
                <span className="mail-main-options-title-filter">
                  <img
                    className="mail-mail-options-title-filter-img"
                    src="/svg/filter.svg"
                  />
                  Filtrar
                </span>

                <Select
                  value={getMessageTypeFilterId(typeMessage)}
                  styleVariant="tertiary"
                  placeholder="Documento"
                  data={listTypeMsg}
                  onChange={handleFilter}
                  name="typeMessage"
                  extractValue={({ id }) => id}
                  renderTextField={({ label }) => label}
                />

                <IconAction
                  icon="refresh"
                  onClick={comunicationQuery.refetch}
                  position="none"
                />
              </div>
              {hasAccess && (
                <Button
                  onClick={handleMessage}
                  icon="plus-dark"
                  text="Nuevo Trámite"
                  color="lightPrimary"
                  textColor="secondary"
                />
              )}
            </div>
          </div>
          <>
            <TableMail
              data={comunicationQuery.data?.listMessage}
              total={comunicationQuery.data?.total}
              columns={columns}
              getPagination={getMessagesPagination}
              isLoading={comunicationQuery.isFetching}
            />
          </>
        </div>
      </Panel>
      <PanelResizeHandle className="resizable" />
      {!isNewMessage && messageId && (
        <Panel defaultSize={30} order={2}>
          <Outlet />
        </Panel>
      )}
      {isNewMessage && (
        <Panel defaultSize={30} order={2}>
          <CardRegisterProcedureGeneral
            onClosing={handleMessage}
            onSave={handleSaveMessage}
            type={'comunication'}
          />
        </Panel>
      )}
    </PanelGroup>
  );
};

export default Communications;
