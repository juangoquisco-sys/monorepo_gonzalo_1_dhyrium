import { useEffect, useState } from 'react';
import type { MailTypeComunication } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';

const useMessage = (url: string, callGetMessage: boolean = true) => {
  const [isNewMessage, setIsNewMessage] = useState(false);
  const [listMessage, setListMessage] = useState<MailTypeComunication[] | null>(
    null
  );

  useEffect(() => {
    if (callGetMessage) {
      getMessages();
    }
  }, []);

  const handleNewMessage = () => setIsNewMessage(!isNewMessage);
  const handleSaveMessage = () => {
    getMessages();
    setIsNewMessage(false);
  };

  const getMessages = () => {
    axiosInstance.get(url).then(res => {
      setListMessage(res.data.mail);
    });
  };

  return {
    listMessage,
    isNewMessage,
    handleNewMessage,
    handleSaveMessage,
    getMessages,
  };
};

export default useMessage;
