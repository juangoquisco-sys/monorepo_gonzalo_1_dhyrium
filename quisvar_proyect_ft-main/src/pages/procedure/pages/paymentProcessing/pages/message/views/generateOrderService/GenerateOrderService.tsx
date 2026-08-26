import { Controller, useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import TextArea from '@/components/textArea/TextArea';
import Button from '@/components/button/Button';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import './generateOrderService.css';
import {
  validateWhiteSpace,
  validateOnlyDecimals,
} from '@/utils/customValidatesForm';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { ServiceOrderData, ServiceOrderForm } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import ReceiptOfPaymentPdf from '../../pdfGenerate/receiptOfPaymentPdf/ReceiptOfPaymentPdf';
import { ServiceOrderPdf } from '../../pdfGenerate/receiptOfPaymentPdf/serviceOrderPdf/ServiceOrderPdf';
import { PAY_TYPE_OPTIONS } from '../../models/definitionsMessage';
import { isOpenViewPdf$ } from '@/services/sharingSubject';
import useCompanySelect from '@/hooks/useCompanySelect';
import { useContext, useEffect, useState } from 'react';
import { MessageCardContext } from '../../components/messageCard/MessageCard';
import { MessagePermission } from '../../../../../../models/definitionsMail.models';
import CardRegisterVoucherDenyOrAccept from '../cardRegisterVoucherDenyOrAccept/CardRegisterVoucherDenyOrAccept';
import useUserCoordinatorMail from '../../hooks/useUserCoordinatorMail';

const GenerateOrderService = () => {
  const { message, handleFinish, hasPermission } =
    useContext(MessageCardContext);
  const { userCoordinatorMailQuery } = useUserCoordinatorMail();
  const [edit, setEdit] = useState(message.status === 'PROCESO');
  const companySelectQuery = useCompanySelect();
  const netPaymentAmount = String(message.total || 0);

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ServiceOrderForm>();

  const onSubmit: SubmitHandler<ServiceOrderForm> = async () => {
    const data = getData();
    await axiosInstance
      .patch(`/paymail/payment-pdf/${message.id}`, {
        paymentPdfData: JSON.stringify(data),
        ordenNumber: data.ordenNumber,
        companyId: +data.company.id,
      })
      .then(() => {
        setEdit(false);
      });
    // handleFinish();
  };

  const getData = () => {
    const { profile, ruc, address } = message.userInit?.user;
    const { company, ...formData } = watch();
    const dataServiceOrder = {
      ...formData,
      ...profile,
      ruc,
      address,
      title: message.title,
      company,
      administrator: userCoordinatorMailQuery.data!,
    };
    return dataServiceOrder;
  };
  const handleClickPdf = (type: 'orderServices' | 'paymentReceipt') => {
    const dataService = getData();
    const isOrderService = type === 'orderServices';
    const { firstName, lastName } = dataService;
    isOpenViewPdf$.setSubject = {
      fileNamePdf: `${
        isOrderService ? 'Orden de servicio' : 'Recibo de Pago'
      } - ${firstName} ${lastName}`,
      pdfComponentFunction: isOrderService
        ? ServiceOrderPdf({ data: dataService })
        : ReceiptOfPaymentPdf({ data: dataService }),
      isOpen: true,
    };
  };

  useEffect(() => {
    if (message?.paymentPdfData) {
      const paymentPdfData: ServiceOrderData = JSON.parse(
        message.paymentPdfData
      );
      if (paymentPdfData) {
        setValue('ordenNumber', paymentPdfData.ordenNumber);
        setValue('company', paymentPdfData.company);
        setValue('payType', paymentPdfData.payType);
        setValue('acountNumber', paymentPdfData.acountNumber);
        setValue('acountCheck', paymentPdfData.acountCheck);
        setValue('concept', paymentPdfData.concept);
        setValue('amount', netPaymentAmount);
      }
    } else {
      setValue('amount', netPaymentAmount);
    }
  }, [message.paymentPdfData, netPaymentAmount, setValue]);

  const viewPdfBtns = [
    {
      icon: 'preview-pdf',
      text: 'Orden de Servicio',
      fn: () => handleClickPdf('orderServices'),
    },
    {
      icon: 'preview-pdf',
      text: 'Recibo de Pago',
      fn: () => handleClickPdf('paymentReceipt'),
    },
  ];
  const finishProcedure = async () => {
    await axiosInstance.patch(`/paymail/done/${message.id}`);
    SnackbarUtilities.success('Tramite finalizado con exito');
    handleFinish();
  };
  const hasRuc = !!getData().ruc?.length;
  return (
    <div className="generateOrderService">
      <h2 className="generateOrderService-title">
        GENERAR ORDEN DE SERVICIO Y RECIBO DE PAGO
      </h2>
      <form
        className="generateOrderService-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="col-input">
          <Controller
            control={control}
            name="company"
            rules={{ required: 'Debes seleccionar una opción' }}
            render={({ field }) => (
              <AdvancedSelect
                {...field}
                placeholder="Selecione una opción"
                options={companySelectQuery.data}
                isClearable
                label={'Empresa:'}
                errors={errors}
                name="company"
                isLoading={companySelectQuery.isFetching}
                onChange={value => {
                  setValue('ordenNumber', value?.orderQuantity ?? 0);
                  field.onChange(value);
                }}
                isDisabled={!edit}
              />
            )}
          />

          <Input
            label="Numero de orden:"
            {...register('ordenNumber', {
              validate: { validateWhiteSpace, validateOnlyDecimals },
              valueAsNumber: true,
            })}
            errors={errors}
            placeholder="N° Orden"
            name="ordenNumber"
            disabled={!edit}
          />
        </div>
        <TextArea
          label="Concepto:"
          {...register('concept', {
            validate: { validateWhiteSpace },
            value: message.header,
          })}
          style={{
            resize: 'none',
          }}
          rows={3}
          name="concept"
          placeholder="Concepto"
          errors={errors}
          disabled={!edit}
        />
        <div className="col-input">
          <Input
            label="Monto (S/.):"
            {...register('amount', {
              validate: { validateWhiteSpace },
              value: netPaymentAmount,
            })}
            errors={errors}
            placeholder="Monto"
            name="amount"
            disabled={!edit}
          />
          <Select
            label="Tipo de pago:"
            {...register('payType', {
              validate: { validateWhiteSpace },
            })}
            name="payType"
            data={PAY_TYPE_OPTIONS}
            extractValue={({ id }) => id}
            renderTextField={({ value }) => value}
            errors={errors}
            placeholder="Seleccione"
            disabled={!edit}
          />
        </div>
        {watch('payType') === 'CUENTA' && (
          <Input
            label="N° de Cuenta"
            {...register('acountNumber', { validate: { validateWhiteSpace } })}
            errors={errors}
            className="messagePage-input"
            placeholder="N° de Cuenta"
            name="acountNumber"
            type="text"
            disabled={!edit}
          />
        )}
        {watch('payType') === 'CHEQUE' && (
          <Input
            label="N° de Cheque"
            {...register('acountCheck', { validate: { validateWhiteSpace } })}
            errors={errors}
            className="messagePage-input"
            placeholder="N° de Cheque"
            name="acountCheck"
            type="text"
            disabled={!edit}
          />
        )}
        {!hasRuc && (
          <span style={{ color: 'red', fontSize: '1rem' }}>
            Usuario sin ruc
          </span>
        )}

        {hasPermission(MessagePermission.EDIT_ORDER_SERVICE) ? (
          <div className="generateOrderService-btns-area">
            <Button
              style={{ width: '100%' }}
              type="button"
              text={edit ? 'CANCELAR  ' : 'EDITAR  '}
              color="grayLigth"
              textColor={edit ? 'danger' : 'primary'}
              borderColor={edit ? 'danger' : 'primary'}
              onClick={() => setEdit(!edit)}
            />
            <Button
              type="submit"
              text="GUARDAR"
              color="primary"
              textColor="light"
              style={{
                display: `${edit ? 'inline-block' : 'none'}`,
                width: '100%',
              }}
            />
          </div>
        ) : (
          <Button
            className={`messagePage-btn-submit`}
            text="Enviar Formulario"
            disabled={!hasRuc}
          />
        )}
      </form>
      <div className="generateOrderService-previews-btns">
        {viewPdfBtns.map(({ fn, icon, text }) => (
          <Button
            key={text}
            icon={icon}
            text={text}
            style={{ fontWeight: 500, width: '100%' }}
            color="grayLigth"
            textColor="grayTertiary"
            borderColor="graySecondary"
            onClick={fn}
            disabled={userCoordinatorMailQuery.isFetching}
          />
        ))}
      </div>

      {hasPermission(MessagePermission.FINISH_PROCEDURE) && (
        <>
          <Button
            text="FINALIZAR TRÁMITE"
            style={{ paddingInline: '3rem' }}
            color="success"
            position="right"
            onClick={finishProcedure}
          />
          <CardRegisterVoucherDenyOrAccept />
        </>
      )}
    </div>
  );
};

export default GenerateOrderService;
