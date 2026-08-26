import { useContext } from 'react';
import FormRegisterProcedure from '../../../../../../components/formRegisterProcedure/FormRegisterProcedure';
import { MessageCardContext } from '../../components/messageCard/MessageCard';
import type { ProcedureSubmit } from '../../../../../../models/types';
import {
  MessageStatus,
  MsgSwitch,
} from '../../../../../../models/definitionsMail.models';
import { axiosInstance } from '@/services/axiosInstance';
import { gerenciaGeneralId } from '@/utils/constantsPdf';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { replyPayMail } from '../../services/payMessage.service';
import useDeclineMessage from '../../../../../../hooks/useDeclineMessage';

const CardMessageDecline = () => {
  const { message, handleFinish } = useContext(MessageCardContext);
  const { getInitialValues, transformDescriptionValues } =
    useDeclineMessage(message);
  const handleSendMessage = async (data: ProcedureSubmit) => {
    switch (message.status) {
      case MessageStatus.RECHAZADO:
        await onDeclineMessage(data);
        break;
      case MessageStatus.OBSERVADO:
        await onCorrectMessage(data);
        break;
    }
    SnackbarUtilities.success('Tramite enviado');
    handleFinish();
  };
  const onCorrectMessage = async (data: ProcedureSubmit) => {
    const { fileUploadFiles, values, mainFile } = data;
    const body = { ...values };
    const formData = new FormData();
    fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
    formData.append('mainProcedure', mainFile, values.title + '.pdf');
    formData.append('data', JSON.stringify(body));
    await axiosInstance.put(`/paymail/${message.id}`, formData);
  };
  const onDeclineMessage = async (data: ProcedureSubmit) => {
    await replyPayMail({
      data,
      messageId: message.id,
      switchMode: MsgSwitch.PROCESO,
    });
  };

  return (
    <FormRegisterProcedure
      type={'payProcedure'}
      submit={handleSendMessage}
      showAddUser={message?.status === 'OBSERVADO'}
      officeIdInit={
        message?.status === 'OBSERVADO' ? gerenciaGeneralId : undefined
      }
      initValues={getInitialValues()}
      initValueEditor={transformDescriptionValues()}
      showReportBtn={message.status === MessageStatus.OBSERVADO}
    />
  );
};

export default CardMessageDecline;
