import { useCallback, useContext, useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import type { MessageType } from '@/types/types';
import './messagePage.css';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import IconAction from '@/components/iconAction/IconAction';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import CardMessageDecline from './views/cardMessageDecline/CardMessageDecline';
import CardMessageReply from './views/cardMessageReply/CardMessageReply';
import CardRegisterVoucher from './views/cardRegisterVoucher/CardRegisterVoucher';
import ProcedureMoreInfo from '../../../../views/procedureMoreInfo/ProcedureMoreInfo';
import {
  MessagePermission,
  MessageStatus,
} from '../../../../models/definitionsMail.models';
import MessageCard from './components/messageCard/MessageCard';
import MessageComment from './components/messageComment/MessageComment';
import MessagePageContain from './components/messagePageContain/MessagePageContain';
import { SocketContext } from '@/context/SocketContex';
import ReportCard from '../../views/reportCard/ReportCard';
import type { OutletProcedureContext } from '../../../../interfaces/procedure.types';
import useGoBackRoute from '@/hooks/useGoBackRoute';

export const MessagePage = () => {
  const { officeId } = useOutletContext<OutletProcedureContext>();
  const handleClose = useGoBackRoute();

  const socket = useContext(SocketContext);
  const { paymessageId } = useParams();
  const { id: userSessionId } = useSelector(
    (state: RootState) => state.userSession
  );

  const [message, setMessage] = useState<MessageType | null>();

  //---------------------------------------------------------------------------
  const getMessage = useCallback(
    (noLoader = true) => {
      axiosInstance
        .get<MessageType>(`/paymail/${paymessageId}`, {
          params: officeId
            ? new URLSearchParams({ officeId: String(officeId) })
            : undefined,
          headers: {
            noLoader,
          },
        })
        .then(({ data }) => {
          if (data.status === 'POR_PAGAR')
            socket.emit('join', `paymail-${paymessageId}`);

          setMessage(data);
        });
    },
    [paymessageId]
  );

  useEffect(() => {
    if (paymessageId && userSessionId) getMessage();
    return () => {
      socket.emit('leave', `paymail-${paymessageId}`);
      setMessage(null);
    };
  }, [getMessage, paymessageId, userSessionId]);

  useEffect(() => {
    if (!paymessageId) return;
    socket.on('server:refresh-pay-message', () => {
      getMessage();
    });
    return () => {
      socket.off('server:refresh-pay-message');
    };
  }, []);

  if (!message)
    return (
      <div className="message-page-loader">
        <IconAction icon="close" onClick={handleClose} zIndex={2} size={0.8} />
        <LoaderForComponent />
      </div>
    );

  const { firstName, lastName } = message.userInit?.user.profile;

  return (
    <MessageCard
      message={message}
      getMessage={getMessage}
      className={`message-page-container `}
    >
      {({ hasPermission, handleFinish }) => (
        <>
          {hasPermission(MessagePermission.VIEW_REGISTER_VOUCHER) && (
            <MessagePageContain>
              <CardRegisterVoucher />
            </MessagePageContain>
          )}

          {hasPermission(MessagePermission.VIEW_MESSAGE_DECLINE) && (
            <MessagePageContain>
              <CardMessageDecline />
            </MessagePageContain>
          )}

          {hasPermission(MessagePermission.VIEW_MESSAGE_FORM) && (
            <MessagePageContain>
              <CardMessageReply />
            </MessagePageContain>
          )}

          {hasPermission(MessagePermission.VIEW_MESSAGE_INFO) && (
            <ProcedureMoreInfo
              message={message}
              status={
                message.onHolding ? 'EN_ESPERA' : MessageStatus[message.status]
              }
              userInitSender={firstName + ' ' + lastName}
              footer={
                hasPermission(MessagePermission.VIEW_COMMENT_MESSAGE_INFO) ? (
                  <MessageComment
                    message={message}
                    hasPermission={hasPermission}
                    handleFinish={handleFinish}
                  />
                ) : undefined
              }
            />
          )}
          <ReportCard />
        </>
      )}
    </MessageCard>
  );
};
