import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const CSS_PRINT_SCALE = 96 / 72;
const DEFAULT_PAGE_WIDTH = 8.5 * 96;
const DEFAULT_PAGE_HEIGHT = 11 * 96;

interface PdfPaginatedPreviewProps {
  data: ArrayBuffer;
  onPageCountChange?: (pageCount: number) => void;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

interface PdfLink {
  id: string;
  label: string;
  style: CSSProperties;
  url?: string;
  pageNumber?: number;
}

interface PdfAnnotation {
  id?: string;
  subtype?: string;
  rect?: number[];
  url?: string;
  unsafeUrl?: string;
  dest?: string | unknown[];
  titleObj?: { str?: string };
  contentsObj?: { str?: string };
}

const safeExternalUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.href);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
};

const resolveDestinationPage = async (
  pdf: PDFDocumentProxy,
  destination?: string | unknown[]
) => {
  if (!destination) return undefined;
  const explicitDestination =
    typeof destination === 'string'
      ? await pdf.getDestination(destination)
      : destination;
  if (!Array.isArray(explicitDestination) || explicitDestination.length === 0) {
    return undefined;
  }

  const pageReference = explicitDestination[0];
  if (Number.isInteger(pageReference)) return Number(pageReference) + 1;
  if (!pageReference || typeof pageReference !== 'object') return undefined;

  try {
    return (await pdf.getPageIndex(pageReference as { num: number; gen: number })) + 1;
  } catch {
    return undefined;
  }
};

interface PdfPreviewPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
}

const PdfPreviewPage = ({ pdf, pageNumber }: PdfPreviewPageProps) => {
  const pageRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(pageNumber <= 3);
  const [dimensions, setDimensions] = useState({
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
  });
  const [links, setLinks] = useState<PdfLink[]>([]);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const element = pageRef.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '1200px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    const renderPage = async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: CSS_PRINT_SCALE });
      const outputScale = Math.max(1, window.devicePixelRatio || 1);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('No se pudo iniciar el lienzo PDF.');

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setDimensions({ width: viewport.width, height: viewport.height });

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform:
          outputScale === 1
            ? undefined
            : [outputScale, 0, 0, outputScale, 0, 0],
      });

      const annotations = (await page.getAnnotations({
        intent: 'display',
      })) as PdfAnnotation[];
      const resolvedLinks = await Promise.all(
        annotations
          .filter(annotation =>
            annotation.subtype === 'Link' && annotation.rect?.length === 4
          )
          .map(async (annotation, index): Promise<PdfLink | null> => {
            const rectangle = viewport.convertToViewportRectangle(
              annotation.rect as number[]
            );
            const left = Math.min(rectangle[0], rectangle[2]);
            const top = Math.min(rectangle[1], rectangle[3]);
            const width = Math.abs(rectangle[2] - rectangle[0]);
            const height = Math.abs(rectangle[3] - rectangle[1]);
            const url = safeExternalUrl(annotation.url ?? annotation.unsafeUrl);
            const destinationPage = url
              ? undefined
              : await resolveDestinationPage(pdf, annotation.dest);
            if (!url && !destinationPage) return null;
            return {
              id: annotation.id ?? `${pageNumber}-${index}`,
              label:
                annotation.contentsObj?.str ||
                annotation.titleObj?.str ||
                (url ? 'Abrir vínculo del documento' : `Ir a la página ${destinationPage}`),
              url,
              pageNumber: destinationPage,
              style: { left, top, width, height },
            };
          })
      );

      await renderTask.promise;
      if (cancelled) return;
      setLinks(resolvedLinks.filter((link): link is PdfLink => Boolean(link)));
      setRendered(true);
      page.cleanup();
    };

    void renderPage().catch(error => {
      if (!cancelled && error?.name !== 'RenderingCancelledException') {
        console.error(`No se pudo representar la página PDF ${pageNumber}.`, error);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, visible]);

  const goToPage = useCallback((targetPage: number) => {
    document
      .getElementById(`dhyrium-pdf-page-${targetPage}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <section
      ref={pageRef}
      id={`dhyrium-pdf-page-${pageNumber}`}
      className={`task-document-editor__pdf-page${rendered ? ' is-rendered' : ''}`}
      style={{ width: dimensions.width, height: dimensions.height }}
      aria-label={`Página ${pageNumber}`}
      aria-busy={!rendered}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="task-document-editor__pdf-links">
        {links.map(link =>
          link.url ? (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={link.style}
              aria-label={link.label}
            />
          ) : (
            <button
              key={link.id}
              type="button"
              style={link.style}
              aria-label={link.label}
              onClick={() => link.pageNumber && goToPage(link.pageNumber)}
            />
          )
        )}
      </div>
      <span className="task-document-editor__pdf-page-number" aria-hidden="true">
        {pageNumber}
      </span>
    </section>
  );
};

const PdfPaginatedPreview = ({
  data,
  onPageCountChange,
  onReady,
  onError,
}: PdfPaginatedPreviewProps) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PDFDocumentProxy | null = null;
    let loadingTask: { destroy: () => Promise<void> } | null = null;

    const load = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        const task = pdfjs.getDocument({
          data: new Uint8Array(data.slice(0)),
          useSystemFonts: true,
        });
        loadingTask = task;
        loadedDocument = await task.promise;
        if (cancelled) {
          await loadedDocument.destroy();
          return;
        }
        setPdf(loadedDocument);
        onPageCountChange?.(loadedDocument.numPages);
        onReady?.();
      } catch (error) {
        if (!cancelled) onError?.(error);
      }
    };

    void load();
    return () => {
      cancelled = true;
      setPdf(null);
      if (loadedDocument) void loadedDocument.destroy();
      else if (loadingTask) void loadingTask.destroy();
    };
  }, [data, onError, onPageCountChange, onReady]);

  if (!pdf) return null;

  return (
    <div className="task-document-editor__pdf-document">
      {Array.from({ length: pdf.numPages }, (_, index) => (
        <PdfPreviewPage key={index + 1} pdf={pdf} pageNumber={index + 1} />
      ))}
    </div>
  );
};

export default PdfPaginatedPreview;
