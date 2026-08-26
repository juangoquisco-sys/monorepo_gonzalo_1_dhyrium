import { useEffect, useRef, useState } from 'react';
import IconAction from '../iconAction/IconAction';
import Modal from '../portal/Modal';
import './viewHtmlToPdf.css';
import { Subscription } from 'rxjs';
import { isOpenViewHtmlToPdf$ } from '@/services/sharingSubject';
import useHtmlToPdf from '@/hooks/useHtmlToPdf';
import { downloadHref } from '@/utils/tools';
import type { ViewHtmlToPdf as ViewHtmlToPdfValue } from '@/services/types';

let fileName = 'documento';

interface ViewHtmlToPdfProps {
  initialValue?: ViewHtmlToPdfValue;
  onReady?: () => void;
}

const ViewHtmlToPdf = ({ initialValue, onReady }: ViewHtmlToPdfProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getPdfToEmbed, pdfUrl, setPdfUrl } = useHtmlToPdf();
  const [pdfUrlBlob, setPdfUrlBlob] = useState<null | string>(null);
  const handleIsOpen = useRef<Subscription>(new Subscription());

  const handleViewHtmlToPdfValue = ({
    isOpen,
    htmlString,
    fileNamePdf,
    size,
    pdfBlob,
  }: ViewHtmlToPdfValue) => {
    setIsOpen(isOpen);
    if (htmlString && size) {
      getPdfToEmbed(htmlString, size, fileNamePdf);
      setPdfUrlBlob(null);
    }
    if (pdfBlob) {
      const editedUrl = URL.createObjectURL(pdfBlob);
      setPdfUrlBlob(editedUrl);
      setPdfUrl(null);
      setTimeout(() => {
        URL.revokeObjectURL(editedUrl);
      }, 60000);
    }
    fileName = fileNamePdf;
  };

  useEffect(() => {
    handleIsOpen.current = isOpenViewHtmlToPdf$.getSubject.subscribe(value => {
      handleViewHtmlToPdfValue(value);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (initialValue) {
      handleViewHtmlToPdfValue(initialValue);
    }
    onReady?.();
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleDownloadPdf = async () => {
    if (pdfUrl) downloadHref(pdfUrl, fileName);
    if (pdfUrlBlob) downloadHref(pdfUrlBlob, fileName);
  };

  return (
    <Modal isOpenProp={isOpen} size={60}>
      <div className="viewPdf">
        <IconAction
          icon="close-white"
          top={0.188}
          right={0.3}
          onClick={handleClose}
          size={1}
          shadow
        />
        <div className="viewPdf-download-link" onClick={handleDownloadPdf}>
          Descargar documento
        </div>
        {pdfUrl && (
          <embed
            src={pdfUrl}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        )}
        {pdfUrlBlob && (
          <embed
            src={pdfUrlBlob}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        )}
      </div>
    </Modal>
  );
};

export default ViewHtmlToPdf;
