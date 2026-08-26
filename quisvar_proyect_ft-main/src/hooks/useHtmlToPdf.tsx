import { useState } from 'react';
import { getHtmlPdfBlob } from '@/utils/htmlToString';

const useHtmlToPdf = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const getPdfToEmbed = async (
    htmlString: string,
    size: 'a4' | 'a5',
    name: string = 'document'
  ) => {
    const blob = await getHtmlPdfBlob(htmlString, size, name);
    const pdfUrl = URL.createObjectURL(blob);
    setPdfUrl(pdfUrl);
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  };

  return { getPdfToEmbed, pdfUrl, setPdfUrl };
};

export default useHtmlToPdf;
