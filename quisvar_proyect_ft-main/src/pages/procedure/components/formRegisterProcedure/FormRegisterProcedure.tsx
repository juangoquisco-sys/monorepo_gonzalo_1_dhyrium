import { createContext, useEffect, useState } from 'react';

import './formRegisterProcedure.css';
import { RADIO_OPTIONS } from '../../models/procedureDefinitions';
import type {
  MessageSendType,
  ProcedureSubmit,
  TypeProcedure,
  userSelect,
} from '../../models/types';

import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { Controller, useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import useContactsProcedure from '../../hooks/useContactsProcedure';
import useDocumentPdfProcedure from '../../hooks/useDocumentPdfProcedure';
import useTitleProcedure from '../../hooks/useTitleProcedure';
import { DNI_GERENTE_GENERAL } from '@/utils/constantsPdf';
import { getHtmlPdfBlob } from '@/utils/htmlToString';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { TYPE_PROCEDURE } from '../../models/definitionsMail.models';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import OptionSelectProcedure from '../optionSelectProcedure/OptionSelectProcedure';
import LocalRichTextEditor from '@/components/localRichTextEditor/LocalRichTextEditor';
import ChipFileDownLoadProcedure from '../chipFileDownLoadProcedure/ChipFileDownLoadProcedure';
import DocumentProcedure from '../documentProcedure/DocumentProcedure';
import ReportSelect from '../reportSelect/ReportSelect';

// El contexto se conserva aquÃ­ por compatibilidad con los consumidores existentes.
// eslint-disable-next-line react-refresh/only-export-components
export const RegisterProcedureContext = createContext(
  {} as FormRegisterProcedureProps
);
interface FormRegisterProcedureProps {
  type: TypeProcedure;
  optionalContacs?: userSelect[] | false;
  submit: (data: ProcedureSubmit) => void;
  initValueEditor?: string;
  showReportBtn?: boolean;
  showAddUser?: boolean;
  initValues?: MessageSendType;
  handleFinish?: () => void;
  officeIdInit?: number;
}

const FormRegisterProcedure = ({
  submit,
  type,
  handleFinish,
  initValueEditor,
  initValues,
  officeIdInit,
  optionalContacs,
  showAddUser,
  showReportBtn,
}: FormRegisterProcedureProps) => {
  const isComunication = type === 'comunication';
  const [isAddReceiver, setIsAddReceiver] = useState(isComunication);
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const handleAddCopy = () => setIsAddReceiver(!isAddReceiver);
  const { dni } = useSelector((state: RootState) => state.userSession.profile);
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<MessageSendType>({
    defaultValues: { ...initValues, description: initValueEditor },
  });

  const { downloadOptions, getHtmlString } = useDocumentPdfProcedure({
    watch,
    trigger,
    type,
  });
  const { restTitle, handleTypeDocumentChange, handleTitle, countMessage } =
    useTitleProcedure({
      setValue,
      watch,
      type,
    });
  const { listContactsProcedure, contacts, secondaryContacts } =
    useContactsProcedure({ type, optionalContacs });

  const handleInputChange = (value: string) => setValue('description', value);

  const onSubmit: SubmitHandler<MessageSendType> = async data => {
    const secondaryReceiver =
      data.secondaryReceiver?.map(receiver => ({
        userId: receiver.id,
      })) ?? [];
    const htmlString = getHtmlString('a4');
    const blobData = await getHtmlPdfBlob(htmlString, 'a4');

    const isArea = data.receiver?.value.includes('area');
    if (!htmlString || (!data.receiver && type !== 'comunication')) return;
    const values = {
      ...data,
      secondaryReceiver,
      receiverId: !isArea ? data.receiver?.id : undefined,
      officeId: isArea ? data.receiver?.id : undefined,
      title: watch('title'),
      description: htmlString,
      reports:
        data.reports && data.reports.length > 0
          ? data.reports.map(({ id }) => id)
          : [],
    };

    submit({ values, fileUploadFiles, mainFile: blobData });
  };

  useEffect(() => {
    if (officeIdInit && contacts) {
      const offices = contacts.filter(({ value }) => value.includes('area'));
      const office = offices.find(({ id }) => id === officeIdInit);
      if (office) setValue('receiver', office);
    }
  }, [officeIdInit, contacts, setValue]);

  const procedureType = TYPE_PROCEDURE[type];

  return (
    <form className="imbox-data-content" onSubmit={handleSubmit(onSubmit)}>
      {watch('type') && (
        <h3 className="messagePage-type-document">
          {watch('type')} N°{' '}
          <input
            type="number"
            className="formRegister-number-document"
            {...register('numberDocument', {
              valueAsNumber: true,
              onChange: handleTitle,
            })}
          />{' '}
          {restTitle}
        </h3>
      )}
      <div className="messagePage-input-contain">
        <Select
          {...register('type', {
            validate: { validateWhiteSpace },
            onChange: handleTypeDocumentChange,
          })}
          name="type"
          data={RADIO_OPTIONS}
          extractValue={({ id }) => id}
          renderTextField={({ value }) => value}
          errors={errors}
          placeholder="Tipo de Documento"
          styleVariant="secondary"
          disabled={!countMessage}
        />

        {!isComunication && (
          <>
            <Controller
              control={control}
              name="receiver"
              rules={{
                required: !!contacts && 'Debes seleccionar una opción',
              }}
              render={({ field }) => (
                <AdvancedSelect
                  {...field}
                  placeholder="Dirigido a"
                  options={contacts || []}
                  components={{
                    Option: OptionSelectProcedure,
                  }}
                  isClearable
                  errors={errors}
                  isLoading={listContactsProcedure.isFetching}
                  isDisabled={dni !== DNI_GERENTE_GENERAL && !!officeIdInit}
                />
              )}
            />

            {watch('receiver') && showAddUser && (
              <Button
                type="button"
                text={procedureType.addUsersText}
                onClick={handleAddCopy}
              />
            )}
          </>
        )}
      </div>

      {isAddReceiver && secondaryContacts && (
        <div className="imbox-receiver-container-copy">
          {!isComunication && (
            <span className="imbox-receiver-label">
              {procedureType.addUsersText}:{' '}
            </span>
          )}
          <Controller
            control={control}
            name="secondaryReceiver"
            rules={{
              required: isAddReceiver && 'Debes seleccionar una opción',
            }}
            render={({ field }) => (
              <AdvancedSelect
                {...field}
                placeholder="Dirigida a"
                options={secondaryContacts}
                isClearable
                errors={errors}
                isMulti
                name="secondaryReceiver"
                isLoading={listContactsProcedure.isFetching}
              />
            )}
          />
        </div>
      )}
      <Input
        {...register('header', { validate: { validateWhiteSpace } })}
        errors={errors}
        placeholder="Asunto"
        name="header"
        styleInput={2}
        type="text"
      />
      <LocalRichTextEditor
        initialContent={initValueEditor}
        minHeight={500}
        onChange={handleInputChange}
      />
      <div className="messageRegister-options">
        <label className="messageRegister-check-container">
          <input
            type="checkbox"
            {...register('signature', {
              value: false,
            })}
          />
          Firma
        </label>
        {showReportBtn && (
          <Controller
            control={control}
            name="reports"
            rules={{ required: 'Debes seleccionar una opción' }}
            render={({ field: { onChange } }) => (
              <ReportSelect
                onChange={onChange}
                name="reports"
                errors={errors}
              />
            )}
          />
        )}
        <div className="pdf-btn-area-view">
          {downloadOptions.map(
            ({ iconOne, iconTwo, id, handleClick, text }) => (
              <ChipFileDownLoadProcedure
                key={id}
                text={text}
                iconOne={iconOne}
                iconTwo={iconTwo}
                onClick={handleClick}
              />
            )
          )}
        </div>
      </div>

      <DocumentProcedure getFilesList={files => setFileUploadFiles(files)} />
      <div className="formRegister-btns">
        <Button type="submit" text="Enviar" />
        {handleFinish && (
          <Button
            type="button"
            text="Finalizar tramite"
            onClick={handleFinish}
            color="danger"
          />
        )}
      </div>
    </form>
  );
};

export default FormRegisterProcedure;
