import { useContext } from 'react';
import { RegularProcedureInfoContext } from '../../RegularProcedureInfoContext';
import {
  MessageStatus,
  MsgSwitch,
} from '../../../../../../models/definitionsMail.models';
import type { ProcedureSubmit } from '../../../../../../models/types';
import FormRegisterProcedure from '../../../../../../components/formRegisterProcedure/FormRegisterProcedure';
import useDeclineMessage from '../../../../../../hooks/useDeclineMessage';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { replyRegularMail } from '../../../../services/regularProcedure.service';
import { axiosInstance } from '@/services/axiosInstance';

const RegularProcedureDecline = () => {
  const { message, handleFinish } = useContext(RegularProcedureInfoContext);
  const { getInitialValues, transformDescriptionValues } =
    useDeclineMessage(message);
  const handleSendMessage = async (data: ProcedureSubmit) => {
    switch (message.status) {
      case MessageStatus.RECHAZADO:
        await replyRegularMail({
          data,
          messageId: message.id,
          switchMode: MsgSwitch.PROCESO,
        });
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
    await axiosInstance.put(`/mail/${message.id}`, formData);
  };
  return (
    <FormRegisterProcedure
      type={'regularProcedure'}
      submit={handleSendMessage}
      showAddUser={message?.status === 'OBSERVADO'}
      initValues={getInitialValues()}
      initValueEditor={transformDescriptionValues()}
    />
  );
};

export default RegularProcedureDecline;
