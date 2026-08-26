import { IoCheckmarkSharp, IoCloseSharp } from 'react-icons/io5';
import Button from '@/components/button/Button';
import TextArea from '@/components/textArea/TextArea';
import './messageComment.css';
import { useEffect, useState, type ChangeEvent } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import { MessagePermission } from '../../../../../../models/definitionsMail.models';
import type { TypeProcedure } from '../../../../../../models/types';
import type { MessageType } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface MessageCommentProps {
  typeProcedure?: TypeProcedure;
  hasPermission: (permission: MessagePermission) => boolean;
  message: MessageType;
  handleFinish: () => void;
}

const TYPE_PROCEDURE: Record<TypeProcedure, string> = {
  comunication: 'mail',
  regularProcedure: 'mail',
  payProcedure: 'payMail',
};
const MessageComment = ({
  typeProcedure = 'payProcedure',
  handleFinish,
  hasPermission,
  message,
}: MessageCommentProps) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (message.comment) {
      setComment(message.comment);
    }
  }, [message]);

  const handleComment = ({ target }: ChangeEvent<HTMLTextAreaElement>) => {
    setComment(target.value);
  };

  const handleApprove = async () => {
    const body = { ids: [message.id] };
    await axiosInstance.put(`${TYPE_PROCEDURE[typeProcedure]}/holding`, body);
    SnackbarUtilities.success('Tramite aceptado');
    handleFinish();
  };
  const handleReject = async () => {
    const body = { comment };
    await axiosInstance.put(
      `${TYPE_PROCEDURE[typeProcedure]}/decline/${message.id}`,
      body
    );
    SnackbarUtilities.error('Tramite rechazado');
    handleFinish();
  };

  return (
    <div className="messageComment-info-footer">
      {!hasPermission(MessagePermission.INTERACT_IN_DECLINE_MESSAGE) && (
        <h2 className="messageComment-info-footer-title ">Rechazado</h2>
      )}
      <TextArea
        placeholder="Añadir comentario"
        value={comment}
        style={{ resize: 'unset' }}
        onChange={handleComment}
        disabled={!hasPermission(MessagePermission.INTERACT_IN_DECLINE_MESSAGE)}
      />
      {hasPermission(MessagePermission.INTERACT_IN_DECLINE_MESSAGE) && (
        <div className="messageComment-info-footer-btns">
          <Button
            variant="ghost"
            leftIcon={<IoCheckmarkSharp size={21} />}
            color="success"
            text="Aprobar"
            onClick={handleApprove}
          />
          <Button
            variant="ghost"
            leftIcon={<IoCloseSharp size={21} />}
            color="danger"
            text="Rechazar"
            onClick={handleReject}
          />
        </div>
      )}
    </div>
  );
};

export default MessageComment;
