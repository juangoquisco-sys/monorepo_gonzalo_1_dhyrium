import { useContext, useEffect, useState } from 'react';
import { MessageCardContext } from '../../components/messageCard/MessageCard';
import {
  MessagePermission,
  MsgSwitch,
} from '../../../../../../models/definitionsMail.models';
import Button from '@/components/button/Button';
import ButtonHeader from '@/components/buttonHeader/ButtonHeader';
import IconAction from '@/components/iconAction/IconAction';
import CardProvied from '../cardProvied/CardProvied';
import MessageSwitch from '../../components/messageSwitch/MessageSwitch';
import FormRegisterProcedure from '../../../../../../components/formRegisterProcedure/FormRegisterProcedure';
import GenerateOrderService from '../generateOrderService/GenerateOrderService';
import { HEADER_OPTION } from '../../models/definitionsMessage';
import type {
  ProcedureSubmit,
  userSelect,
} from '../../../../../../models/types';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { isOpenConfirmAction$ } from '@/services/sharingSubject';
import { replyPayMail } from '../../services/payMessage.service';
import useRole from '@/hooks/useRole';

const CardMessageReply = () => {
  const [isProvied, setIsProvied] = useState(false);
  const [procedureOption, setProcedureOption] = useState<'finish' | 'continue'>(
    'continue'
  );

  const { hasAccess } = useRole('MOD', 'tramites', 'tramite-de-pago');

  const handleProvied = () => setIsProvied(!isProvied);

  const { message, handleFinish, hasPermission, handleClose } =
    useContext(MessageCardContext);

  const [switchMode, setSwitchMode] = useState<MsgSwitch>(MsgSwitch.PROCESO);

  useEffect(() => {
    if (hasPermission(MessagePermission.EDIT_ORDER_SERVICE)) {
      setProcedureOption('finish');
    }
  }, []);

  const toggleSwitch = () => {
    const mode =
      switchMode === MsgSwitch.PROCESO
        ? MsgSwitch.RECHAZADO
        : MsgSwitch.PROCESO;
    setSwitchMode(mode);
  };
  const handleArchiverMessage = () => {
    axiosInstance.patch(`/paymail/archived/${message.id}`).then(handleFinish);
  };

  const handleArchiver = () => {
    isOpenConfirmAction$.setSubject = {
      isOpen: true,
      function: () => handleArchiverMessage,
    };
  };

  const getHistoryContacts = () => {
    const contacts: userSelect[] = message.users.map(
      ({ user: { id, profile, address, ruc } }) => ({
        value: 'user-' + id,
        label: profile.firstName + ' ' + profile.lastName,
        address: address,
        profile: profile,
        ruc: ruc,
        id: id,
      })
    );

    return contacts;
  };
  const onSubmit = async (data: ProcedureSubmit) => {
    await replyPayMail({ data, messageId: message.id, switchMode });
    SnackbarUtilities.success('Proceso exitoso ');
    handleFinish();
  };

  return (
    <>
      {hasPermission(MessagePermission.VIEW_HEADER_OPTIONS) && (
        <div className="message-header-content-options  ">
          {HEADER_OPTION.filter(option =>
            hasPermission(MessagePermission.FINISH_PROCEDURE)
              ? option.procedureOpt === 'finish'
              : hasPermission(MessagePermission.CONTINUE_PROCEDURE)
              ? option.procedureOpt === 'continue'
              : true
          )
            .filter(option =>
              !hasAccess ? option.procedureOpt !== 'finish' : true
            )
            .map(({ procedureOpt, text }) => (
              <ButtonHeader
                key={procedureOpt}
                isActive={procedureOption === procedureOpt}
                text={text}
                onClick={() => setProcedureOption(procedureOpt)}
              />
            ))}
          {procedureOption === 'continue' && (
            <IconAction
              icon={isProvied ? 'seal-dark' : 'seal'}
              size={1.2}
              onClick={handleProvied}
            />
          )}
        </div>
      )}
      {procedureOption === 'continue' &&
        (isProvied ? (
          <CardProvied
            type={'payProcedure'}
            message={message}
            onSave={handleClose}
          />
        ) : (
          <>
            {hasPermission(MessagePermission.VIEW_SWITCH_REPLY) && (
              <MessageSwitch
                isProceed={switchMode === MsgSwitch.PROCESO}
                onClick={toggleSwitch}
              />
            )}

            <FormRegisterProcedure
              type={'payProcedure'}
              submit={onSubmit}
              showAddUser={false}
              optionalContacs={
                switchMode === MsgSwitch.RECHAZADO && getHistoryContacts()
              }
            />
            {switchMode === MsgSwitch.RECHAZADO && (
              <Button
                onClick={handleArchiver}
                type="button"
                text="Archivar Tramite"
                color="grayLigth"
                borderColor="gray"
                textColor="gray"
              />
            )}
          </>
        ))}

      {procedureOption === 'finish' && <GenerateOrderService />}
    </>
  );
};

export default CardMessageReply;
