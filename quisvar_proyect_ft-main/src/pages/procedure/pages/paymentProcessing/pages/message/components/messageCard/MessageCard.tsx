import { useLocation } from 'react-router-dom';
import IconAction from '@/components/iconAction/IconAction';
import type { MessageType } from '@/types/types';
import {
  MessagePermission,
  MessageStatus,
  MessageUser,
  PayMessageUserPermissions,
} from '../../../../../../models/definitionsMail.models';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { MailPageContext } from '../../../../context/MailPageContext';
import useGoBackRoute from '@/hooks/useGoBackRoute';

interface MessageCardContextProps {
  message: MessageType;
  hasPermission: (permission: MessagePermission) => boolean;
  handleClose: () => void;
  handleFinish: () => void;
  getMessage: (noLoader: boolean) => void;
}

export const MessageCardContext = createContext({} as MessageCardContextProps);

interface ArgsChildren {
  hasPermission: (permission: MessagePermission) => boolean;
  handleFinish: () => void;
}
export interface MessageCardProps {
  message: MessageType;
  children: (args: ArgsChildren) => ReactNode;
  className?: string;
  getMessage: (noLoader: boolean) => void;
}
const MessageCard = ({
  children,
  message,
  className,
  getMessage,
}: MessageCardProps) => {
  const userSession = useSelector((state: RootState) => state.userSession);
  const goBackRoute = useGoBackRoute();
  const { state } = useLocation();
  const forPay = useRef<boolean>(!!state?.forPay).current;

  // const { payMailQuery } = usePayMail();
  const { payMailQuery, query } = useContext(MailPageContext);

  const [userPermission, setUserPermission] = useState<null | MessageUser>(
    null
  );

  const { isAccessReception } = useSelector(
    (state: RootState) => state.userSession
  );

  const hasPermission = (permission: MessagePermission) => {
    if (!userPermission) return false;
    const status = message.onHolding ? MessageStatus.EN_ESPERA : message.status;
    const hasPermision =
      PayMessageUserPermissions[userPermission]?.[status]?.includes(permission);
    return hasPermision || false;
  };
  useEffect(() => {
    const isSender = userSession.id === message.userInit.userId;
    const mainReceiver =
      !!query?.office || forPay || (isSender && message.status === 'OBSERVADO');
    if (isAccessReception && message.onHolding && !isSender) {
      return setUserPermission(MessageUser.RECEPTION);
    } else if (mainReceiver) {
      return setUserPermission(MessageUser.RECEIVER);
    } else if (isSender) {
      return setUserPermission(MessageUser.SENDER);
    } else {
      // handleClose();
      return setUserPermission(MessageUser.VIEWER);
    }
  }, [message]);

  const handleClose = () => {
    goBackRoute();
  };

  const handleFinish = () => {
    handleClose();
    payMailQuery.refetch();
  };
  return (
    <MessageCardContext.Provider
      value={{
        message,
        hasPermission,
        handleClose,
        handleFinish,
        getMessage,
      }}
    >
      <div className={className}>
        <IconAction icon="close" onClick={handleClose} zIndex={2} size={0.8} />
        {children({ hasPermission, handleFinish })}
      </div>
    </MessageCardContext.Provider>
  );
};

export default MessageCard;
