import './cardRegisterMessage.css';
import type { ProcedureSubmit } from '../../../../models/types';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { axiosInstance } from '@/services/axiosInstance';
import Button from '@/components/button/Button';
import { gerenciaGeneralId } from '@/utils/constantsPdf';
import { INITIAL_VALUE_EDITOR } from '@/utils/canvas/editor';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import FormRegisterProcedure from '../../../../components/formRegisterProcedure/FormRegisterProcedure';
import { PiXBold } from 'react-icons/pi';

interface CardRegisterMessageProps {
  onClosing?: () => void;
  onSave?: () => void;
}

const CardRegisterMessage = ({
  onClosing,
  onSave,
}: CardRegisterMessageProps) => {
  const userSession = useSelector((state: RootState) => state.userSession);
  const onSubmit = async (data: ProcedureSubmit) => {
    const { fileUploadFiles, values, mainFile } = data;
    const body = {
      ...values,
      senderId: userSession.id,
    };

    const formData = new FormData();
    fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
    formData.append('mainProcedure', mainFile, values.title + '.pdf');
    formData.append('data', JSON.stringify(body));
    await axiosInstance.post(`/paymail`, formData);
    SnackbarUtilities.success('Proceso exitoso ');
    onSave?.();
  };

  const handleClose = () => {
    onClosing?.();
  };

  return (
    <motion.div className="inbox-send-container-main">
      <div className="imnbox-title">
        <h3 className="imbox-container-title">Nuevo Trámite</h3>

        <Button
          onClick={handleClose}
          variant="ghost"
          leftIcon={<PiXBold size={21} color="#000" />}
        />
      </div>
      <FormRegisterProcedure
        type={'payProcedure'}
        showReportBtn
        submit={data => onSubmit(data)}
        initValueEditor={INITIAL_VALUE_EDITOR}
        officeIdInit={gerenciaGeneralId}
        showAddUser
      />
    </motion.div>
  );
};

export default CardRegisterMessage;
