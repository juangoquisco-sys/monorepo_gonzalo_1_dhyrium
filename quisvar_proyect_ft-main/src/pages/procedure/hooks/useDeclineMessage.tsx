import type { MessageType } from '@/types/types';
import type { MessageSendType } from '../models/types';

const useDeclineMessage = (message: MessageType) => {
  const getInitialValues = (): MessageSendType => {
    const regex = /N°(\d+)/;
    const match = message.title.match(regex);

    return {
      header: message.header,
      title: message.title,
      description: '',
      type: message.type,
      signature: false,
      numberDocument: +(match?.[1] ?? 0),
    };
  };

  const transformDescriptionValues = () => {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = message.description;
    const elementDescription = tempElement.querySelector('.main-body');

    return elementDescription?.innerHTML || '';
  };

  return { getInitialValues, transformDescriptionValues };
};

export default useDeclineMessage;
