import { useOutletContext, useParams } from 'react-router-dom';
import './regularProcedureInfo.css';
import type { MessageType } from '@/types/types';
import { useEffect, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import IconAction from '@/components/iconAction/IconAction';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import {
  MessagePermission,
  MessageStatus,
  MessageUser,
  RegularMessageUserPermissions,
} from '../../../../models/definitionsMail.models';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import ProcedureMoreInfo from '../../../../views/procedureMoreInfo/ProcedureMoreInfo';

import useGoBackRoute from '@/hooks/useGoBackRoute';
import type { OutletContextRegularProcedure } from '../../interfaces/regularProcedure.types';
import MessageComment from '../../../paymentProcessing/pages/message/components/messageComment/MessageComment';
import MessagePageContain from '../../../paymentProcessing/pages/message/components/messagePageContain/MessagePageContain';
import RegularProcedureReply from './views/regularProcedureReply/RegularProcedureReply';
import RegularProcedureDecline from './views/regularProcedureDecline/RegularProcedureDecline';
import { RegularProcedureInfoContext } from './RegularProcedureInfoContext';

const RegularProcedureInfo = () => {
  const handleClose = useGoBackRoute();

  const { messageId } = useParams();
  const [message, setMessage] = useState<MessageType | null>();
  const [userPermission, setUserPermission] = useState<null | MessageUser>(
    null
  );
  const { reloadMessages, officeId } =
    useOutletContext<OutletContextRegularProcedure>();
  const userSession = useSelector((state: RootState) => state.userSession);

  useEffect(() => {
    getMessage();
  }, [messageId]);

  const getMessage = () => {
    axiosInstance
      .get<MessageType>(`/mail/${messageId}`, {
        params: officeId
          ? new URLSearchParams({ officeId: String(officeId) })
          : undefined,
        headers: { noLoader: true },
      })
      .then(({ data }) => {
        setMessage(data);
      });
  };

  useEffect(() => {
    if (!message) return;
    const isSender = message.users.find(
      ({ user, role, type }) =>
        user.id === userSession.id && role === 'MAIN' && type == 'SENDER'
    );
    const mainReceiver = message.users.find(
      ({ user, role, type }) =>
        user.id === userSession.id && role === 'MAIN' && type == 'RECEIVER'
    );

    const mainUserDecline =
      message.status === MessageStatus.OBSERVADO &&
      message.userInit.userId === userSession.id;

    if (userSession.isAccessReception && message.onHolding && !isSender) {
      return setUserPermission(MessageUser.RECEPTION);
    } else if (mainReceiver || mainUserDecline) {
      return setUserPermission(MessageUser.RECEIVER);
    } else if (isSender) {
      return setUserPermission(MessageUser.SENDER);
    } else {
      return setUserPermission(MessageUser.VIEWER);
    }
  }, [message]);
  if (!message)
    return (
      <div className="message-page-loader">
        <IconAction icon="close" onClick={handleClose} zIndex={2} size={0.8} />
        <LoaderForComponent />
      </div>
    );

  const handleFinish = () => {
    reloadMessages();
    handleClose();
  };

  const hasPermission = (permission: MessagePermission) => {
    if (!userPermission) return false;
    const status = message.onHolding ? MessageStatus.EN_ESPERA : message.status;
    const hasPermision =
      RegularMessageUserPermissions[userPermission]?.[status]?.includes(
        permission
      );
    return hasPermision || false;
  };

  const initialSender = message.userInit.user;
  return (
    <RegularProcedureInfoContext.Provider
      value={{
        getMessage,
        handleClose,
        handleFinish,
        hasPermission,
        message,
        reloadMessages,
      }}
    >
      <div className="message-page-container">
        <IconAction icon="close" onClick={handleClose} zIndex={2} size={0.8} />

        {hasPermission(MessagePermission.VIEW_MESSAGE_DECLINE) && (
          <MessagePageContain>
            <RegularProcedureDecline />
          </MessagePageContain>
        )}
        {hasPermission(MessagePermission.VIEW_MESSAGE_FORM) && (
          <MessagePageContain>
            <RegularProcedureReply />
          </MessagePageContain>
        )}

        {hasPermission(MessagePermission.VIEW_MESSAGE_INFO) && (
          <ProcedureMoreInfo
            message={message}
            status={MessageStatus[message.status]}
            userInitSender={
              initialSender.profile.firstName +
              ' ' +
              initialSender.profile.lastName
            }
            typeProcedure="regularProcedure"
            footer={
              hasPermission(MessagePermission.VIEW_COMMENT_MESSAGE_INFO) ? (
                <MessageComment
                  message={message}
                  hasPermission={hasPermission}
                  handleFinish={handleFinish}
                  typeProcedure="regularProcedure"
                />
              ) : undefined
            }
          />
        )}
      </div>
    </RegularProcedureInfoContext.Provider>
  );
};

export default RegularProcedureInfo;
