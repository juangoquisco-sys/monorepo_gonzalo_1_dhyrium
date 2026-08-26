/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import Button from '@/components/button/Button';
import DropDownSimple from '@/components/dropDownSimple/DropDownSimple';
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
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { formatDate } from '@/utils/formatDate';
import {
  dataInitialPdf,
  convertToDynamicObject,
} from '@/utils/pdfReportFunctions';
import './cardRegisterMessageUpdate.css';
import { usePaymailUsers } from '../../../../../../hooks/useProcedureUserOptions';
import { PDFGenerator } from '../../../../pdfGenerate/GeneratePdf';
import { JOB_DATA } from '../../../../../../../userCenter/pages/users/models/dataUserRegister';
import DocumentProcedure from '../../../../../../components/documentProcedure/DocumentProcedure';

const YEAR = new Date().getFullYear();

interface CardRegisterMessageUpdateProps {
  message: MessageType;
  receiverId?: number;
  quantityFiles?: quantityType[] | null;
  onSave?: () => void;
}

interface MessageUpdateFormValues {
  type: string;
  header: string;
  description: string;
  title: string;
}

const CardRegisterMessageUpdate = ({
  message,
  quantityFiles,
  // receiverId,
  onSave,
}: CardRegisterMessageUpdateProps) => {
  const { userSession } = useSelector((state: RootState) => state);
  const { data: users = [] } = usePaymailUsers();
  const { lastName, firstName } = userSession.profile;
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MessageUpdateFormValues>();
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const HashUser = createNameHash(`${firstName} ${lastName}`);
  const [pdfData, setpdfData] = useState<PdfDataProps>(dataInitialPdf);
  const handleInputChange = (event: string) => setValue('description', event);

  const [receiver, setReceiver] = useState<receiverType | null>(null);
  const contacts = useMemo(
    () => users?.filter(user => user.id !== userSession.id),
    [userSession, users]
  );
  useEffect(() => {
    setValue('header', message.header);
    setValue('title', message.title);
    setValue('description', message.description);
    setValue('type', message.type);
  }, [message]);

  const handleTitle = (value: string) => {
    const countFile = quantityFiles?.find(file => file.type === value);
    const newIndex = (countFile ? countFile._count.type : 0) + 1;
    return `${value} N°${newIndex} DHYRIUM-${HashUser}-${YEAR}`;
  };
  const onSubmit: SubmitHandler<MessageUpdateFormValues> = async data => {
    if (!receiver) return;
    const paymessageId = message.id;
    const value = {
      ...data,
      receiverId: receiver.id,
      title: handleTitle(watch('type')),
    };
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    const formData = new FormData();
    fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
    formData.append('data', JSON.stringify(value));
    axiosInstance
      .put(`/paymail/${paymessageId}`, formData, { headers })
      .then(onSave);
  };

  const sender = message.users.filter(user => user.type === 'SENDER')[0].user;
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

  return (
    <form
      className="inbox-forward-data-content"
      onSubmit={handleSubmit(onSubmit)}
    >
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
        <LocalRichTextEditor
          initialContent={message.description}
          minHeight={320}
          onChange={handleInputChange}
        />
      </div>
      <PDFGenerator data={pdfData} handleFocus={handleReportPDF} />
      <DocumentProcedure getFilesList={files => setFileUploadFiles(files)} />

      <div className="inbox-forward-btn-submit-container">
        <Button
          className={`inbox-forward-btn-submit`}
          // onClick={() => {}}
          text="Enviar"
        />
      </div>
    </form>
  );
};

export default CardRegisterMessageUpdate;
