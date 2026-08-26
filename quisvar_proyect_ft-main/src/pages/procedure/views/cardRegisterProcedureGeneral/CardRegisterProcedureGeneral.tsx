import Button from '@/components/button/Button';
import './cardRegisterProcedureGeneral.css';
import type { ProcedureSubmit } from '../../models/types';
import { TYPE_PROCEDURE } from '../../models/definitionsMail.models';
import FormRegisterProcedure from '../../components/formRegisterProcedure/FormRegisterProcedure';
import { axiosInstance } from '@/services/axiosInstance';
import { INITIAL_VALUE_EDITOR } from '@/utils/canvas/editor';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { PiXBold } from 'react-icons/pi';

interface CardRegisterProcedureGeneralProps {
  onSave?: () => void;
  onClosing: () => void;
  type: 'comunication' | 'regularProcedure';
}

const CardRegisterProcedureGeneral = ({
  onClosing,
  onSave,
  type,
}: CardRegisterProcedureGeneralProps) => {
  const typeProcedure = TYPE_PROCEDURE[type];

  const onSubmit = async (data: ProcedureSubmit) => {
    const { fileUploadFiles, values, mainFile } = data;
    const formData = new FormData();
    fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
    formData.append('data', JSON.stringify(values));
    formData.append('mainProcedure', mainFile, values.title + '.pdf');
    formData.append('category', typeProcedure.category);
    await axiosInstance.post(`/mail`, formData, {
      params: { category: typeProcedure.category },
    });
    SnackbarUtilities.success('Proceso exitoso ');
    onSave?.();
    onClosing();
  };

  return (
    <div className="inbox-send-container-main">
      <div className="imnbox-title">
        <h3 className="imbox-container-title">{typeProcedure?.title}</h3>

        <div className="imbox-container-options">
          <Button
            onClick={onClosing}
            variant="ghost"
            leftIcon={<PiXBold size={21} color="#000" />}
          />
        </div>
      </div>
      <FormRegisterProcedure
        type={type}
        submit={data => onSubmit(data)}
        initValueEditor={INITIAL_VALUE_EDITOR}
        showAddUser
      />
    </div>
  );
};

export default CardRegisterProcedureGeneral;
