import { useMemo, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import DropDownSimple from '@/components/dropDownSimple/DropDownSimple';
import Button from '@/components/button/Button';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type {
  MessageType,
  PdfDataProps,
  quantityType,
  receiverType,
} from '@/types/types';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import LocalRichTextEditor from '@/components/localRichTextEditor/LocalRichTextEditor';
import { createNameHash, radioOptions } from '@/utils/files/files.utils';
import {
  convertToDynamicObject,
  dataInitialPdf,
} from '@/utils/pdfReportFunctions';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { formatDate } from '@/utils/formatDate';
import './cardRegisterMessageForward.css';
import useRole from '@/hooks/useRole';
import { usePaymailModeratorUsers } from '../../../../../../hooks/useProcedureUserOptions';
import { PDFGenerator } from '../../../../pdfGenerate/GeneratePdf';
import { JOB_DATA } from '../../../../../../../userCenter/pages/users/models/dataUserRegister';
import { YEAR } from '../../models/definitionsMessage';
import DocumentProcedure from '../../../../../../components/documentProcedure/DocumentProcedure';
import { isOpenConfirmAction$ } from '@/services/sharingSubject';

interface CardRegisterMessageForwardProps {
  message: MessageType;
  quantityFiles?: quantityType[] | null;
  onSave?: () => void;
}

interface MessageForwardFormValues {
  type: string;
  header: string;
  description: string;
}

const CardRegisterMessageForward = ({
  message,
  quantityFiles,
  onSave,
}: CardRegisterMessageForwardProps) => {
  const { userSession } = useSelector((state: RootState) => state);
  const { data: users = [] } = usePaymailModeratorUsers();
  const { hasAccess } = useRole('MOD', 'tramites', 'tramite-de-pago');
  const { lastName, firstName } = userSession.profile;
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MessageForwardFormValues>();
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const HashUser = createNameHash(`${firstName} ${lastName}`);
  const [pdfData, setpdfData] = useState<PdfDataProps>(dataInitialPdf);
  const handleInputChange = (event: string) => setValue('description', event);
  const [receiver, setReceiver] = useState<receiverType | null>(null);
  const usersId = useMemo(
    () =>
      message.users
        .filter(user => user.role !== 'SECONDARY')
        .map(user => user.userId),
    [message.users]
  );
  const contacts = useMemo(
    () =>
      users?.filter(
        user => usersId.includes(user.id) && user.id !== userSession.id
      ),
    [userSession, users, usersId]
  );

  const handleTitle = (value: string) => {
    const countFile = quantityFiles?.find(file => file.type === value);
    const newIndex = (countFile ? countFile._count.type : 0) + 1;
    return `${value} N°${newIndex} DHYRIUM-${HashUser}-${YEAR}`;
  };
  const onSubmit: SubmitHandler<MessageForwardFormValues> = async data => {
    if (!receiver)
      return SnackbarUtilities.warning(
        'Asegurese de seleccioner el destinatario.'
      );
    const values = {
      ...data,
      paymessageId: message.id,
      receiverId: receiver.id,
      title: handleTitle(watch('type')),
    };
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    const formData = new FormData();
    fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
    formData.append('data', JSON.stringify(values));
    axiosInstance
      .post(`/paymail/reply?status=RECHAZADO`, formData, { headers })
      .then(onSave);
  };
  const sender = message.users.filter(user => user.type === 'SENDER')[0].user;
  const handleArchiverMessage = () => {
    axiosInstance.patch(`/paymail/archived/${message.id}`).then(onSave);
  };

  const handleReportPDF = () => {
    const header = watch('header');
    const description = watch('description');
    const to = sender.profile.firstName + ' ' + sender.profile.lastName;
    const toUser = users.find(user => user.id === sender?.id);
    const filterJob = (value?: string | null, job?: string | null) => {
      if (value !== 'Titulado') return value ?? undefined;
      return JOB_DATA.find(item => item.value === job)?.abrv;
    };
    setpdfData({
      from: userSession.profile.firstName + ' ' + userSession.profile.lastName,
      header,
      body: convertToDynamicObject(description ?? ''),
      title: handleTitle(watch('type')),
      to,
      date: formatDate(new Date(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour12: true,
      }),
      toDegree: filterJob(toUser?.degree, toUser?.job?.label),
      toPosition: toUser?.position ?? undefined,
      dni: userSession.profile.dni,
      fromDegree: filterJob(
        userSession.profile.degree,
        userSession.profile.job.label
      ),
      fromPosition: userSession.profile.description,
    });
  };

  const handleArchiver = () => {
    isOpenConfirmAction$.setSubject = {
      isOpen: true,
      function: () => handleArchiverMessage,
    };
  };
  return (
    <form className="messagePage-send-mail" onSubmit={handleSubmit(onSubmit)}>
      {watch('type') && (
        <h3 className="messagePage-type-document">
          {' '}
          {handleTitle(watch('type'))}
        </h3>
      )}

      <div className="messagePage-input-contain">
        <Select
          {...register('type', {
            validate: { validateWhiteSpace },
          })}
          name="type"
          data={radioOptions}
          extractValue={({ id }) => id}
          renderTextField={({ value }) => value}
          errors={errors}
          placeholder="Tipo de Documento"
          className="messagePage-input"
        />
        <div className="imbox-receiver-choice-dropdown">
          <DropDownSimple
            classNameInput="messagePage-input"
            type="search"
            data={contacts}
            textField="name"
            itemKey="id"
            placeholder="Dirigido a"
            selector
            droper
            valueInput={(value, id) => setReceiver({ id: +id, value })}
            required
          />
        </div>
      </div>
      <Input
        {...register('header', { validate: { validateWhiteSpace } })}
        errors={errors}
        className="messagePage-input"
        placeholder="Asunto"
        name="header"
        type="text"
      />
      <div className="inbox-editor-container">
        <LocalRichTextEditor minHeight={320} onChange={handleInputChange} />
      </div>

      <PDFGenerator data={pdfData} handleFocus={handleReportPDF} />
      <DocumentProcedure getFilesList={files => setFileUploadFiles(files)} />

      <div className="inbox-forward-btn-submit-container">
        <Button className={`inbox-forward-btn-submit`} text="No Procede" />
        {hasAccess && (
          <Button
            onClick={handleArchiver}
            className={`inbox-forward-btn-archiver`}
            type="button"
            text="Archivar Tramite"
          />
        )}
      </div>
    </form>
  );
};

export default CardRegisterMessageForward;
