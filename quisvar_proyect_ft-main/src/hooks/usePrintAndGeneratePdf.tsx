import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { RefObject } from 'react';
import { useReactToPrint } from 'react-to-print';

interface usePrintAndGeneratePdfProps {
  ref: RefObject<HTMLDivElement | null>;
  divName: string;
  pdfName: string;
  orientation?: 'p' | 'l';
  width?: number;
  captureWidth?: number;
  captureScale?: number;
  captureClassName?: string;
  onBeforeCapture?: (element: HTMLElement) => void | Promise<void>;
  onAfterCapture?: (element: HTMLElement) => void | Promise<void>;
}
const usePrintAndGeneratePdf = ({
  captureClassName = 'is-capturing',
  captureScale = 2,
  captureWidth,
  divName,
  onAfterCapture,
  onBeforeCapture,
  orientation = 'p',
  pdfName,
  ref,
  width,
}: usePrintAndGeneratePdfProps) => {
  const resolvedWidth = captureWidth ?? width;

  const prepareCaptureElement = async (htmlElement: HTMLElement) => {
    const originalWidth = htmlElement.style.width;
    const originalMaxWidth = htmlElement.style.maxWidth;
    const originalOverflow = htmlElement.style.overflow;

    if (resolvedWidth) {
      htmlElement.style.width = `${resolvedWidth}px`;
      htmlElement.style.maxWidth = 'none';
    }
    htmlElement.style.overflow = 'visible';
    htmlElement.classList.add(captureClassName);
    await onBeforeCapture?.(htmlElement);

    return async () => {
      htmlElement.style.width = originalWidth;
      htmlElement.style.maxWidth = originalMaxWidth;
      htmlElement.style.overflow = originalOverflow;
      htmlElement.classList.remove(captureClassName);
      await onAfterCapture?.(htmlElement);
    };
  };

  const addCanvasToPdf = (canvas: HTMLCanvasElement) => {
    const pdf = new jsPDF({
      unit: 'in',
      format: 'letter',
      orientation,
    });
    const margin = 0.18;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const pageCanvasHeight = Math.floor(
      (usableHeight * canvas.width) / usableWidth
    );

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(
        pageCanvasHeight,
        canvas.height - renderedHeight
      );
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const context = pageCanvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo preparar la pagina del PDF');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (pageIndex > 0) {
        pdf.addPage();
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.96);
      const imgHeight = (sliceHeight * usableWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeight);

      renderedHeight += sliceHeight;
      pageIndex += 1;
    }

    pdf.save(`${pdfName}.pdf`);
  };

  const handlePrint = useReactToPrint({
    contentRef: ref,
    print: async printIframe => {
      try {
        const document = printIframe.contentDocument;
        if (document) {
          const htmlElement = document.getElementsByClassName(
            divName
          )[0] as HTMLElement;
          const restoreCaptureElement = await prepareCaptureElement(
            htmlElement
          );

          try {
            const canvas = await html2canvas(htmlElement, {
              backgroundColor: '#ffffff',
              scale: captureScale,
              useCORS: true,
              windowWidth: htmlElement.scrollWidth,
              windowHeight: htmlElement.scrollHeight,
            });
            addCanvasToPdf(canvas);
          } finally {
            await restoreCaptureElement();
          }
        }
      } catch (error) {
        console.error('Error generating image:', error);
      }
    },
  });

  return handlePrint;
};

export default usePrintAndGeneratePdf;
