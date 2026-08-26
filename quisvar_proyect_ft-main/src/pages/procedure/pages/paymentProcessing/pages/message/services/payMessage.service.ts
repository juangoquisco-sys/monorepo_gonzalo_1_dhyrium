import { axiosInstance } from '@/services/axiosInstance';
import type { ProcedureSubmit } from '../../../../../models/types';
import type { MsgSwitch } from '../../../../../models/definitionsMail.models';

interface ReplyPayMailProps {
  data: ProcedureSubmit;
  switchMode: MsgSwitch;
  messageId: number;
}

export const replyPayMail = async ({
  data,
  messageId,
  switchMode,
}: ReplyPayMailProps) => {
  const { fileUploadFiles, values, mainFile } = data;
  const body = { ...values, paymessageId: messageId };
  const formData = new FormData();
  fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
  const headers = {
    'Content-type': 'multipart/form-data',
  };
  formData.append('data', JSON.stringify(body));
  formData.append('mainProcedure', mainFile, values.title + '.pdf');
  const res = await axiosInstance.post(
    `/paymail/reply?status=${switchMode}`,
    formData,
    { headers }
  );
  return res;
};
