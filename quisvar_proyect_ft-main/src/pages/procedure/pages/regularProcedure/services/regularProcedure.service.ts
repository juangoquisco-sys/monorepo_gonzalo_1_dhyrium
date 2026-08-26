import { axiosInstance } from '@/services/axiosInstance';
import type { ProcedureSubmit } from '../../../models/types';
import type { MsgSwitch } from '../../../models/definitionsMail.models';

interface ReplyRegularMailProps {
  data: ProcedureSubmit;
  switchMode: MsgSwitch;
  messageId: number;
}

enum TypeStatus {
  PROCESO = 'PENDIENTE',
  RECHAZADO = 'RECHAZADO',
}

export const replyRegularMail = async ({
  data,
  messageId,
  switchMode,
}: ReplyRegularMailProps) => {
  const { fileUploadFiles, values, mainFile } = data;
  const { header, receiverId, title, description, officeId } = values;
  const formData = new FormData();
  fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
  formData.append('mainProcedure', mainFile, values.title + '.pdf');
  formData.append(
    'data',
    JSON.stringify({ header, receiverId, title, description, officeId })
  );
  const res = await axiosInstance.post(
    `/mail/${messageId}/reply?status=${TypeStatus[switchMode]}`,
    formData
  );
  return res;
};
