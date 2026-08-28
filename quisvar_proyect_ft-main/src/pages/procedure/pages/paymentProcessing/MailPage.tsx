import { useState } from 'react';
import './mailPage.css';
import type { MessageType } from '@/types/types';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import CardGenerateReport from '@/components/cardGenerateReport/CardGenerateReport';
import CardRegisterMessage from './views/cardRegisterMessage/CardRegisterMessage';
import CardRegisterPayroll from './views/cardRegisterPayroll/CardRegisterPayroll';
import PayMailTable from './views/payMailTable/PayMailTable';
import useRole from '@/hooks/useRole';
import ReceptionView from '../../views/reception/ReceptionView';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import usePayMail from './hooks/usePayMail';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MailPageContext } from './context/MailPageContext';
import HeaderProcedure from '../../components/headerProcedure/HeaderProcedure';

export const MailPage = () => {
  const { hasAccess } = useRole('MOD', 'tramites', 'tramite-de-pago');
  const { hasAccess: hasAccessPayroll } = useRole(
    'MOD',
    'tramites',
    'planilla'
  );
  const { paymessageId } = useParams();
  const navigate = useNavigate();
  const { isAccessReception } = useSelector(
    (state: RootState) => state.userSession
  );

  const [isNewMessage, setIsNewMessage] = useState(false);
  //-----------------------------------------------------------------------
  const {
    payMailQuery,
    handleSelectOption,
    getMessagesPagination,
    query,
    searchParams,
  } = usePayMail();

  const handleNewMessage = () => {
    setIsNewMessage(true);
  };
  const handleCloseMessage = () => {
    setIsNewMessage(false);
  };
  const handleSaveMessage = () => {
    payMailQuery.refetch();
    handleCloseMessage();
  };

  const optionsMailHeader = [
    {
      iconOn: query.office ? 'inbox' : 'tabler',
      iconOff: query.office ? 'inbox-black' : 'tabler-black',
      text: query.office ? 'RECIBIDOS' : 'ENVIADOS',
      isActive: query.typeMail === 'RECEIVER',
      funcion: () => handleSelectOption('RECEIVER'),
    },
    {
      iconOn: 'archive-regular',
      iconOff: 'archiver-box-black',
      text: 'ARCHIVADOS',
      isActive: query.status === 'ARCHIVADO',
      funcion: () => handleSelectOption('ARCHIVER'),
    },
    ...(isAccessReception
      ? [
          {
            iconOn: 'desk-filled',
            iconOff: 'desk-regular',
            text: 'MESA DE PARTES',
            isActive: query.typeMail === 'RECEPTION',
            funcion: () => handleSelectOption('RECEPTION'),
          },
        ]
      : []),
  ];

  const goToPayroll = () => {
    navigate('/centro-de-usuarios/planillas');
  };

  return (
    <MailPageContext.Provider
      value={{
        query,
        payMailQuery,
        hasAccess,
        paymessageId,
        getMessagesPagination,
        handleCloseMessage,
        searchParams,
      }}
    >
      <div className="mail-page-layout">
        <PanelGroup direction="horizontal">
          <Panel
            defaultSize={isNewMessage || paymessageId ? 50 : 100}
            order={1}
          >
            <div className="mail-main-master-container">
              <HeaderProcedure
                optionsMailHeader={optionsMailHeader}
                goToPayroll={goToPayroll}
                handleNewMessage={handleNewMessage}
                hasAccessPayroll={hasAccessPayroll}
                query={query}
                refresh={payMailQuery.refetch}
              />
              {query.typeMail !== 'RECEPTION' ? (
                <PayMailTable />
              ) : (
                <ReceptionView
                  type="payProcedure"
                  totalMail={payMailQuery.data?.total}
                  searchParams={searchParams}
                  onSave={payMailQuery.refetch}
                  receptionMail={
                    payMailQuery.data?.listMessage as MessageType[]
                  }
                  getMessagesPagination={getMessagesPagination}
                  isLoading={payMailQuery.isFetching}
                  idSelect={paymessageId}
                />
              )}
            </div>
          </Panel>
          <PanelResizeHandle className="resizable" />
          {!isNewMessage && paymessageId && (
            <Panel defaultSize={50} order={2}>
              <Outlet context={{ officeId: query.office }} />
            </Panel>
          )}
          {isNewMessage && (
            <Panel defaultSize={50} order={2}>
              <CardRegisterMessage
                onClosing={handleCloseMessage}
                onSave={handleSaveMessage}
              />
            </Panel>
          )}
        </PanelGroup>
      </div>
      <CardGenerateReport />
      <CardRegisterPayroll />
    </MailPageContext.Provider>
  );
};
