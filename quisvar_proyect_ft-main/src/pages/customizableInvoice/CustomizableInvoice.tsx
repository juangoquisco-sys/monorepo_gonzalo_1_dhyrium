import { useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import xml2js from 'xml2js';
import type { CompaniesSelect } from '@/types/types';
import type { InvoiceXML } from '@/types/typeFactura';
import './customizableInvoice.css';
import InvoicePdf from './pdfGenerator/invoicePdf/InvoicePdf';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import FileNameContainer from '@/components/fileNameContainer/FileNameContainer';
import Input from '@/components/Input/Input';
import UploadFileInput from '@/components/uploadFileInput/UploadFileInput';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import useInvoiceCompany from './hooks/useInvoiceCompany';
import type { SingleValue } from 'react-select';
import { isOpenViewPdf$ } from '@/services/sharingSubject';
import useCompanySelect from '@/hooks/useCompanySelect';

export const CustomizableInvoice = () => {
  const companySelectQuery = useCompanySelect();
  const invoiceCompanyMutation = useInvoiceCompany();
  const timeout = useRef<null | NodeJS.Timeout>(null);
  const [company, setCompany] = useState<null | CompaniesSelect>(null);

  const [fileName, setFileName] = useState({ xmlName: '', jpgName: '' });
  const [invoiceXml, setInvoiceXml] = useState<InvoiceXML | null>(null);
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const reader = new FileReader();
    reader.onload = e => {
      const xmlText = e?.target?.result;
      if (xmlText && file) parseXML(xmlText, file);
    };
    if (file) reader.readAsText(file);
  };

  const parseXML = (xmlText: string | ArrayBuffer, file: File) => {
    const parser = new xml2js.Parser({ explicitArray: false });
    parser.parseString(xmlText, (error, result) => {
      if (error || result.Invoice?.['cbc:UBLVersionID'] !== '2.1') {
        SnackbarUtilities.error('Error al analizar XML');
      } else {
        setFileName({ ...fileName, xmlName: file.name });
        setInvoiceXml(result.Invoice);
      }
    });
  };

  const handleChangeData = ({ target }: FocusEvent<HTMLInputElement>) => {
    if (!company) return;
    const { name, value } = target;
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    timeout.current = setTimeout(() => {
      const { color, phone, email, id } = company;
      invoiceCompanyMutation.mutate({
        color,
        phone,
        email,
        idCompany: id,
        [name]: value,
      });
    }, 1000);
    setCompany({ ...company, [name]: value });
  };

  const handleSelectOption = async (option: SingleValue<CompaniesSelect>) => {
    if (option) setCompany(option);
  };

  const openPdf = () => {
    if (!company || !invoiceXml) return;
    isOpenViewPdf$.setSubject = {
      fileNamePdf: `factura-${company.name}.pdf`,
      pdfComponentFunction: InvoicePdf({ company, dataXml: invoiceXml }),
      isOpen: true,
    };
  };

  const handleDeleteFile = (type: 'xmlName' | 'jpgName') => {
    if (type === 'xmlName') setInvoiceXml(null);
    setFileName({ ...fileName, [type]: '' });
  };
  return (
    <div className="customizableInvoice">
      <div className="customizableInvoice-title-container">
        <h1 className="customizableInvoice-title">
          PERSONALIZAR FACTURA ELECTRÓNICA
        </h1>
        <h2 className="customizableInvoice-subtitle">
          Insertar logo de empresa a facturas electrónicas emitidas por clave
          SOL
        </h2>
      </div>
      <div className="customizableInvoice-file-container">
        <p className="customizableInvoice-text">Seleccione la empresa</p>
        <AdvancedSelect
          options={companySelectQuery.data}
          menuPosition="fixed"
          isLoading={companySelectQuery.isFetching}
          placeholder={'Seleccione...'}
          isDisabled={companySelectQuery.isFetching}
          onChange={handleSelectOption}
        />
        <div className="customizableInvoice-color-container">
          <span className="customizableInvoice-color-label">
            Color primario:
          </span>
          <input
            type="color"
            onChange={handleChangeData}
            name="color"
            disabled={!company}
            value={company?.color || '#fff'}
          />
        </div>
        <div className="col-input">
          <Input
            label="Celular:"
            onChange={handleChangeData}
            value={company?.phone || ''}
            disabled={!company}
            placeholder="celular"
            name="phone"
          />
          <Input
            onChange={handleChangeData}
            label="Correo:"
            disabled={!company}
            value={company?.email || ''}
            placeholder="correo electronico"
            name="email"
          />
        </div>
      </div>
      <div className="customizableInvoice-file-container">
        <p className="customizableInvoice-text">
          Suba la factura generada por la SUNAT en formato .XML
        </p>
        {!fileName.xmlName ? (
          <UploadFileInput
            name=" Cargar Archivo XML"
            subName=" O arrastre el archivo XML aquí"
            onChange={handleFileUpload}
            accept=".xml"
            multiple
          />
        ) : (
          <FileNameContainer
            fileName={fileName.xmlName}
            icon="icon-xml"
            onDelete={() => handleDeleteFile('xmlName')}
          />
        )}
      </div>

      <button
        disabled={!invoiceXml || !company}
        className="customizableInvoice-btn-send"
        onClick={openPdf}
      >
        Crear PDF
      </button>
    </div>
  );
};
