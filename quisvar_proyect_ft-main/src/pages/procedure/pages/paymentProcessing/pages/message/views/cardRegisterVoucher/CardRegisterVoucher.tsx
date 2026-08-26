import { useContext, useEffect, useState, type ChangeEvent } from 'react';
import { pdf } from '@react-pdf/renderer';
import './cardRegisterVoucher.css';
import ChipFileMessage from '../../../../components/chipFileMessage/ChipFileMessage';
import { axiosInstance, URL } from '@/services/axiosInstance';
import { addFilesList, deleteFileOnList } from '@/utils/files/files.utils';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import InputFile from '@/components/inputFile/InputFile';
import Button from '@/components/button/Button';
import UploadFileInput from '@/components/uploadFileInput/UploadFileInput';
import TextArea from '@/components/textArea/TextArea';
import ReceiptOfPaymentPdf from '../../pdfGenerate/receiptOfPaymentPdf/ReceiptOfPaymentPdf';
import { ServiceOrderPdf } from '../../pdfGenerate/receiptOfPaymentPdf/serviceOrderPdf/ServiceOrderPdf';
import { MessageCardContext } from '../../components/messageCard/MessageCard';
import { IoSend, IoTrash } from 'react-icons/io5';
import { isOpenViewPdf$ } from '@/services/sharingSubject';
import type { ServiceOrderData } from '@/types/types';
import { PiFilePdfFill } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';

type PdfDocumentElement = NonNullable<Parameters<typeof pdf>[0]>;

const CardRegisterVoucher = () => {
  const { message, getMessage } = useContext(MessageCardContext);
  const [concept, setConcept] = useState('');
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const dataServiceOrder: ServiceOrderData | undefined = JSON.parse(
    message.paymentPdfData
  );

  // import { PiFilePdfFill } from 'react-icons/pi';

  useEffect(() => {
    setConcept(dataServiceOrder?.concept || message.header);
  }, [message.paymentPdfData]);

  const addFiles = (newFiles: File[]) => {
    const allPdfFiles = newFiles.every(file => file.type === 'application/pdf');
    if (!allPdfFiles)
      return SnackbarUtilities.warning('Asegurese de solo subir archivos pdfs');

    if (fileUploadFiles.length + newFiles.length > 2)
      return SnackbarUtilities.warning('Asegurese de subir solo 2 archivos');

    const _files = addFilesList(fileUploadFiles, newFiles);
    setFileUploadFiles(_files);
  };

  const deleteFiles = (delFiles: File) => {
    const _files = deleteFileOnList(fileUploadFiles, delFiles);
    if (_files) setFileUploadFiles(_files);
  };

  const handleSendVoucher = async () => {
    if (!fileUploadFiles.length) return;
    const formData = new FormData();
    fileUploadFiles.forEach(_file => formData.append('fileMail', _file));
    await axiosInstance.post(`/paymail/payment-files/${message.id}`, formData);
    getMessage(false);
    setFileUploadFiles([]);
  };

  const handleClickPdf = async ({
    name,
    pdfComponent,
  }: {
    name: string;
    pdfComponent: PdfDocumentElement;
  }) => {
    isOpenViewPdf$.setSubject = {
      fileNamePdf: name,
      pdfComponentFunction: pdfComponent,
      isOpen: true,
    };
  };
  const documents = [
    {
      text: 'Descargar Orden de Servicio sin firmar',
      fn: () =>
        handleClickPdf({
          name: 'Orden de Servicio',
          pdfComponent: <ServiceOrderPdf data={dataServiceOrder!} />,
        }),
    },
    {
      text: 'Descargar Recibo de Pago sin firmar',
      fn: () =>
        handleClickPdf({
          name: 'Recibo de Pago',
          pdfComponent: <ReceiptOfPaymentPdf data={dataServiceOrder!} />,
        }),
    },
  ];
  const handleFileUpload = async ({
    target,
  }: ChangeEvent<HTMLInputElement>) => {
    const file = target.files?.[0];
    if (!file) return;
    const formdata = new FormData();
    formdata.append('rxh', file);
    target.value = '';
    await axiosInstance.post(`payMail/payment-rxh/${message.id}`, formdata);
    getMessage(false);
  };

  const deleteRhe = async () => {
    await axiosInstance.delete(`payMail/payment-rxh/${message.id}`);
    getMessage(false);
  };
  const updateConcept = async () => {
    const paymentPdfData = JSON.stringify({
      concept,
    });
    const body = {
      paymentPdfData,
    };
    await axiosInstance.patch(`payMail/concept/${message.id}`, body);
    getMessage(false);
  };
  const handleConcept = ({ target }: ChangeEvent<HTMLTextAreaElement>) => {
    setConcept(target.value);
  };
  const lastFile = message.filesPay.slice(-1)[0];

  return (
    <div className="cardRegisterVoucher-container">
      <div className="cardRegisterVoucher-RHE">
        <h3 className="cardRegisterVoucher-title">
          RECIBO POR HONORARIOS ELECTRÓNICO - SUNAT
        </h3>
        {message.rxhFile ? (
          <>
            <div className="cardRegisterVoucher-file">
              <PiFilePdfFill color="red" size={20} />
              RHE - {message.userInit.user.ruc}
              <IoTrash
                className="cardRegisterVoucher-delete-icon"
                size={18}
                color={COLOR_CSS.gray}
                onClick={deleteRhe}
                cursor={'pointer'}
              />
            </div>
            <object
              data={`${URL}/${message.rxhFile.path.replace(
                'public',
                'file-user'
              )}/${message.rxhFile.name}`}
              type="application/pdf"
              style={{ width: '100%', height: '20rem' }}
            />
          </>
        ) : (
          <UploadFileInput
            name="Cargar RHE"
            subName="O arrastre y suelte el archivo aquí"
            onChange={handleFileUpload}
            accept=".pdf"
          />
        )}
        <TextArea
          label="Concepto"
          style={{
            resize: 'none',
          }}
          value={concept}
          onChange={handleConcept}
          rows={2}
          name="concept"
          placeholder="Concepto"
          disabled={!!message.paymentPdfData}
        />
        {!message.paymentPdfData && (
          <Button
            text="Enviar"
            style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}
            position="right"
            onClick={updateConcept}
          />
        )}
      </div>
      {dataServiceOrder?.dni && (
        <>
          <h3 className="cardRegisterVoucher-title">
            FIRMA Y SUBA SUS DOCUMENTOS:
          </h3>

          {documents.map(doc => (
            <div
              key={doc.text}
              className="cardRegisteVoucher-service-orden"
              onClick={doc.fn}
            >
              <div className="cardRegisterVoucher-options">
                <figure className="cardRegisteVoucher-figure">
                  <img src={`/svg/payment-pdf.svg`} />
                </figure>
                {doc.text}
              </div>
              <figure className="cardRegisteVoucher-figure">
                <img src={`/svg/download_icon.svg`} />
              </figure>
            </div>
          ))}

          <h3 className="cardRegisterVoucher-subTitle">
            Suba su recibo por honorarios y su orden de servicios firmado:
          </h3>
          <div className="cardRegisterVoucher-file-options">
            <InputFile
              className="message-file-area"
              getFilesList={files => addFiles(files)}
            />
          </div>
          {fileUploadFiles.length > 0 && (
            <div className="inbox-container-file-grid">
              {fileUploadFiles.map((file, i) => (
                <ChipFileMessage
                  className="message-files-list"
                  text={file.name}
                  key={i}
                  onClose={() => deleteFiles(file)}
                />
              ))}
            </div>
          )}
          <div className="cardRegisterVoucher-last-file">
            <h3 className="cardRegisterVoucher-file-subtitle">
              Ultimos documentos enviados:
            </h3>
            <div className="inbox-container-file-grid">
              {lastFile?.files.map(file => (
                <ChipFileMessage
                  key={file.id}
                  className="message-files-list"
                  text={file.name}
                  link={file.path + '/' + file.name}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={handleSendVoucher}
            text="Subir"
            position="right"
            leftIcon={<IoSend size={15} />}
          />
        </>
      )}
    </div>
  );
};

export default CardRegisterVoucher;
