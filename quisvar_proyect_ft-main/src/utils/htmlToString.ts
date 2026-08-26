import html2pdf, { type Html2PdfOptions } from 'html2pdf.js';
import docImg from '/img/plantillaDocs.png';
import { loader$ } from '@/services/sharingSubject';

export const getHtmlPdfBlob = async (
  htmlString: string,
  size: 'a4' | 'a5',
  name: string = 'document'
) => {
  loader$.setSubject = true;

  const options: Html2PdfOptions = {
    margin: [20, 22, 14, 22],
    filename: name,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2, useCORS: true },
    useCORS: true,
    pagebreak: { mode: 'avoid-all' },
    jsPDF: { format: size, orientation: 'p', putTotalPages: true },
  };

  const pdf = await html2pdf().set(options).from(htmlString).toPdf().get('pdf');
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(docImg, 'PNG', 0, 0, pageWidth, pageHeight, '', 'FAST');
  }
  const blob = await pdf.output('blob');

  loader$.setSubject = false;

  return blob;
};
