import { Controller, useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { ProviedForm } from '../../models/types';
import './cardProvied.css';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  validateOnlyNumbers,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { useState } from 'react';
import type { TypeProcedure } from '../../../../../../models/types';
import { TYPE_PROCEDURE } from '../../../../../../models/definitionsMail.models';
import { axiosInstance } from '@/services/axiosInstance';
import type { MessageType } from '@/types/types';
import OptionSelectProcedure from '../../../../../../components/optionSelectProcedure/OptionSelectProcedure';
import DocumentProcedure from '../../../../../../components/documentProcedure/DocumentProcedure';
import { useNavigate } from 'react-router-dom';
import { isOpenViewHtmlToPdf$ } from '@/services/sharingSubject';
import useContactsProcedure from '../../../../../../hooks/useContactsProcedure';

interface CardProviedProps {
  type: TypeProcedure;
  message: MessageType;
  onSave?: () => void;
}

const CardProvied = ({ type, message, onSave }: CardProviedProps) => {
  // const [contacts, setContacts] = useState<null | Contact[]>(null);
  const { listContactsProcedure, contacts } = useContactsProcedure({ type });
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const navigate = useNavigate();
  const {
    handleSubmit,
    register,
    watch,
    trigger,
    control,
    formState: { errors },
  } = useForm<ProviedForm>();

  // useEffect(() => {
  //   getContacs();
  // }, []);
  // const getContacs = () => {
  //   const url = `/office?menuId=${2}&typeRol=MOD&subMenuId=${
  //     TYPE_PROCEDURE[type].idSubmenu
  //   }`;
  //   axiosInstance.get<Office[]>(url).then(res => {
  //     const contacts = res.data
  //       .map(el => {
  //         const users = el.users.map(({ user }) => ({
  //           value: 'user-' + user.id,
  //           label: user.profile.firstName + ' ' + user.profile.lastName,
  //           isDisabled: true,
  //           ...user,
  //         }));
  //         const area = {
  //           value: 'area-' + el.id,
  //           id: el.id,
  //           label: el.name,
  //           quantity: el._count.users,
  //           manager: el.manager!,
  //         };
  //         const userWithArea = [area, ...users];
  //         return userWithArea;
  //       })
  //       .flat();
  //     setContacts(contacts);
  //   });
  // };

  const handlePreview = async () => {
    const isValid = await trigger();
    if (!isValid) return;
    const { title, numberPage, observations, to } = watch();
    const formData = new FormData();

    const body = {
      title,
      header: title,
      officeId: to.id,
      observations,
      numberPage,
      to: to.label,
    };
    formData.append('data', JSON.stringify(body));

    axiosInstance
      .post(
        `/generate-pdf/${TYPE_PROCEDURE[type].previewPdf}/${message.id}`,
        formData,
        {
          responseType: 'blob',
        }
      )
      .then(res => {
        isOpenViewHtmlToPdf$.setSubject = {
          isOpen: true,
          fileNamePdf: watch('title'),
          pdfBlob: res.data,
        };
      });
  };
  const onSubmit: SubmitHandler<ProviedForm> = async data => {
    const { title, numberPage, observations, to } = data;
    const body = {
      title,
      header: title,
      officeId: to.id,
      [TYPE_PROCEDURE[type].idName]: message.id,
      observations,
      numberPage,
      to: to.label,
    };
    const formData = new FormData();

    fileUploadFiles.forEach(file => formData.append('fileMail', file));

    formData.append('data', JSON.stringify(body, null, 3));

    await axiosInstance.post(
      `/${TYPE_PROCEDURE[type].provied}/reply-seal`,
      formData
    );
    SnackbarUtilities.success('La operación se realizo con exito.');
    onSave?.();
    navigate('/tramites/tramite-de-pago?refresh=' + Date.now());
  };

  return (
    <form className="cardProvied" onSubmit={handleSubmit(onSubmit)}>
      <div className="messagePage-input-contain">
        <Input
          {...register('title', {
            validate: { validateWhiteSpace },
            value: message.title,
          })}
          errors={errors}
          label="Titulo:"
          placeholder="Titulo"
          styleInput={2}
          disabled
        />
        <Input
          {...register('numberPage', {
            validate: { validateWhiteSpace, validateOnlyNumbers },
            valueAsNumber: true,
            value: message.office?.quantity,
          })}
          errors={errors}
          label="Númeracion:"
          placeholder="Númeracion"
          styleInput={2}
        />
      </div>
      {contacts && (
        <Controller
          control={control}
          name="to"
          rules={{ required: 'Debes seleccionar una opción' }}
          render={({ field }) => (
            <AdvancedSelect
              {...field}
              placeholder="Selecione una opción"
              options={contacts}
              components={{ Option: OptionSelectProcedure }}
              isClearable
              label={'Para:'}
              errors={errors}
              isLoading={listContactsProcedure.isFetching}
              isOptionDisabled={option => !!option?.isDisabled}
            />
          )}
        />
      )}
      <Input
        {...register('observations', { validate: { validateWhiteSpace } })}
        errors={errors}
        label="Observaciones:"
        placeholder="Observaciones"
        maxLength={95}
        styleInput={2}
      />
      <DocumentProcedure getFilesList={files => setFileUploadFiles(files)} />

      <div className="cardProvied-btns-container">
        <Button
          type="button"
          text="Previsualizar"
          icon="eyes-blue"
          variant="outline"
          onClick={handlePreview}
        />
        <Button type="submit" text="Enviar" style={{ margin: 0 }} />
      </div>
    </form>
  );
};

export default CardProvied;
