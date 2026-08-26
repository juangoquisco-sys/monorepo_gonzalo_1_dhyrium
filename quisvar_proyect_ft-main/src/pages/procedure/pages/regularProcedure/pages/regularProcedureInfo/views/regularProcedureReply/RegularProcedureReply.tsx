import { useContext, useState } from 'react';
import IconAction from '@/components/iconAction/IconAction';
import CardProvied from '../../../../../paymentProcessing/pages/message/views/cardProvied/CardProvied';
import './regularProcedureReply.css';
import FormRegisterProcedure from '../../../../../../components/formRegisterProcedure/FormRegisterProcedure';
import { MsgSwitch } from '../../../../../../models/definitionsMail.models';
import type { ProcedureSubmit } from '../../../../../../models/types';
import { axiosInstance } from '@/services/axiosInstance';
import { RegularProcedureInfoContext } from '../../RegularProcedureInfoContext';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { replyRegularMail } from '../../../../services/regularProcedure.service';
import MessageSwitch from '../../../../../paymentProcessing/pages/message/components/messageSwitch/MessageSwitch';

const RegularProcedureReply = () => {
  const [isProvied, setIsProvied] = useState(false);
  const [switchMode, setSwitchMode] = useState<MsgSwitch>(MsgSwitch.PROCESO);
  const { message, handleFinish, handleClose } = useContext(
    RegularProcedureInfoContext
  );
  const toggleSwitch = () => {
    const mode =
      switchMode === MsgSwitch.PROCESO
        ? MsgSwitch.RECHAZADO
        : MsgSwitch.PROCESO;
    setSwitchMode(mode);
  };
  const handleProvied = () => setIsProvied(!isProvied);
  const onSubmit = async (data: ProcedureSubmit) => {
    await replyRegularMail({ data, messageId: message.id, switchMode });
    SnackbarUtilities.success('Proceso exitoso ');
    handleFinish();
  };

  const handleDoneProcedure = () => {
    axiosInstance.patch(`/mail/done/${message.id}`).then(handleFinish);
  };
  return (
    <>
      <>
        <div className="regularProcedureInfo-header">
          <IconAction
            icon={isProvied ? 'seal-dark' : 'seal'}
            size={1.2}
            onClick={handleProvied}
            position="none"
          />
        </div>
        {isProvied ? (
          <CardProvied
            type={'regularProcedure'}
            message={message}
            onSave={handleClose}
          />
        ) : (
          <>
            <MessageSwitch
              isProceed={switchMode === MsgSwitch.PROCESO}
              onClick={toggleSwitch}
            />
            <FormRegisterProcedure
              type={'regularProcedure'}
              submit={data => onSubmit(data)}
              handleFinish={handleDoneProcedure}
            />
          </>
        )}
      </>
    </>
  );
};

export default RegularProcedureReply;
