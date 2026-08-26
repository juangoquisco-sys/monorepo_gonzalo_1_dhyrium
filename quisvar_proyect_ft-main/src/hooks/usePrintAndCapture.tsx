import type { RefObject } from 'react';
import html2canvas from 'html2canvas';
import { useReactToPrint } from 'react-to-print';
import { downloadHref } from '@/utils/tools';

interface usePrintAndCaptureProps {
  ref: RefObject<HTMLDivElement | null>;
  divName: string;
  imgName: string;
  width?: number;
  captureWidth?: number;
  captureScale?: number;
  captureClassName?: string;
  onBeforeCapture?: (element: HTMLElement) => void | Promise<void>;
  onAfterCapture?: (element: HTMLElement) => void | Promise<void>;
}
const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('No se pudo convertir la captura a imagen'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.95
    );
  });

const usePrintAndCapture = ({
  captureClassName = 'is-capturing',
  captureScale = 2,
  captureWidth,
  divName,
  imgName,
  onAfterCapture,
  onBeforeCapture,
  ref,
  width = 1000,
}: usePrintAndCaptureProps) => {
  const resolvedWidth = captureWidth ?? width;

  const prepareCaptureElement = async (htmlElement: HTMLElement) => {
    const originalWidth = htmlElement.style.width;
    const originalMaxWidth = htmlElement.style.maxWidth;
    const originalOverflow = htmlElement.style.overflow;

    htmlElement.style.width = `${resolvedWidth}px`;
    htmlElement.style.maxWidth = 'none';
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

  const getElementToCapture = () => {
    const htmlElement = ref.current;
    if (!htmlElement) {
      throw new Error('No se encontró el contenedor para generar la imagen');
    }

    if (htmlElement.classList.contains(divName)) {
      return htmlElement;
    }

    const childElement = htmlElement.getElementsByClassName(divName)[0] as
      | HTMLElement
      | undefined;

    return childElement || htmlElement;
  };
  const getImageFile = async () => {
    const htmlElement = getElementToCapture();
    const restoreCaptureElement = await prepareCaptureElement(htmlElement);

    try {
      const canvas = await html2canvas(htmlElement, {
        backgroundColor: '#ffffff',
        scale: captureScale,
        useCORS: true,
        windowWidth: htmlElement.scrollWidth,
        windowHeight: htmlElement.scrollHeight,
      });

      const imageBlob = await canvasToBlob(canvas);
      return new File([imageBlob], `${imgName}.jpg`, {
        type: 'image/jpeg',
      });
    } finally {
      await restoreCaptureElement();
    }
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
            const imgData = canvas.toDataURL('image/png');
            downloadHref(imgData, imgName + '.png');
          } finally {
            await restoreCaptureElement();
          }
        }
      } catch (error) {
        console.error('Error generating image:', error);
      }
    },
  });

  return {
    downloadImage: handlePrint,
    getImageFile, // 👈 ahora también lo exportas
  };
};

export default usePrintAndCapture;
