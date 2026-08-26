import { useEffect, useState } from 'react';
import IconAction from '../iconAction/IconAction';
import Modal from '../portal/Modal';
import './viewPdf.css';
import { isOpenViewPdf$ } from '@/services/sharingSubject';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { downloadBlob, downloadHref } from '@/utils/tools';
import useModalSubscription from '@/hooks/useModalSubscription';
import type { ViewPdf as ViewPdfValue } from '@/services/types';

type PdfDocumentElement = NonNullable<Parameters<typeof pdf>[0]>;

let fileName = 'documento';

const getDownloadFileName = () =>
  fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

interface ViewPdfProps {
  initialValue?: ViewPdfValue;
  onReady?: () => void;
}

const ViewPdf = ({ initialValue, onReady }: ViewPdfProps) => {
  const [pdfComponent, setPdfComponent] = useState<PdfDocumentElement | null>(
    null
  );
  const [pdfUrlBlob, setPdfUrlBlob] = useState<null | string>(null);
  const [pdfUrl, setPdfUrl] = useState<null | string>(null);

  const handleViewPdfValue = ({
    pdfComponentFunction,
    fileNamePdf,
    pdfBlob,
    pdfUrl,
  }: ViewPdfValue) => {
    if (pdfComponentFunction) {
      setPdfComponent(pdfComponentFunction);
      setPdfUrlBlob(null);
      setPdfUrl(null);
    }
    if (pdfBlob) {
      const editedUrl = URL.createObjectURL(pdfBlob);
      setPdfUrlBlob(editedUrl);
      setPdfComponent(null);
      setPdfUrl;
      setTimeout(() => {
        URL.revokeObjectURL(editedUrl);
      }, 60000);
    }
    if (pdfUrl) {
      setPdfUrl(pdfUrl);
      setPdfComponent(null);
      setPdfUrlBlob(null);
    }
    fileName = fileNamePdf;
  };

  const { onCloseModal, isOpenModal, onOpenModal } = useModalSubscription(
    isOpenViewPdf$,
    handleViewPdfValue
  );

  useEffect(() => {
    if (initialValue) {
      handleViewPdfValue(initialValue);
      if (initialValue.isOpen) onOpenModal();
    }
    onReady?.();
  }, []);

  const handleDownloadPdf = async () => {
    if (pdfComponent) {
      const pdfDownload = await pdf(pdfComponent).toBlob();
      downloadBlob(pdfDownload, getDownloadFileName());
    }
    if (pdfUrlBlob) downloadHref(pdfUrlBlob, getDownloadFileName());
    if (pdfUrl) {
      fetch(pdfUrl)
        .then(response => response.blob())
        .then(blob => {
          const blobURL = URL.createObjectURL(blob);
          downloadHref(blobURL, getDownloadFileName());
        });
    }
  };
  return (
    <Modal isOpenProp={isOpenModal} size={60}>
      <div className="viewPdf">
        <IconAction
          icon="close-white"
          top={0.188}
          right={0.3}
          onClick={onCloseModal}
          size={1}
          shadow
        />
        <div className="viewPdf-download-link" onClick={handleDownloadPdf}>
          Descargar documento
        </div>
        {pdfComponent && (
          <PDFViewer width="100%" height="100%">
            {pdfComponent}
          </PDFViewer>
        )}
        {pdfUrlBlob && (
          <embed
            src={pdfUrlBlob}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        )}
        {pdfUrl && (
          <object
            data={pdfUrl}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        )}
      </div>
    </Modal>
  );
};

export default ViewPdf;
