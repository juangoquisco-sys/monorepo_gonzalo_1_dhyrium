declare module 'html2pdf.js' {
  export type Html2PdfOptions = {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type: 'jpeg' | 'png' | 'bmp'; quality: number };
    useCORS?: boolean;
    enableLinks?: boolean;
    html2canvas?: {
      useCORS?: boolean;
      allowTaint?: boolean;
      backgroundColor?: string;
      canvas?: HTMLCanvasElement;
      foreignObjectRendering?: boolean;
      imageTimeout?: number;
      ignoreElements?: (e: HTMLElement) => boolean;
      logging?: boolean;
      proxy?: string;
      removeContainer?: boolean;
      scale?: number;
      width?: number;
      height?: number;
      x?: number;
      y?: number;
      scrollX?: number;
      scrollY?: number;
      windowWidth?: number;
      windowHeight?: number;
    };
    pagebreak?: {
      mode: 'avoid-all';
    };
    jsPDF?: {
      orientation?: 'p' | 'l';
      unit?: 'pt' | 'mm' | 'cm' | 'in' | 'px' | 'pc' | 'em' | 'ex';
      format?:
        | 'a0'
        | 'a1'
        | 'a2'
        | 'a3'
        | 'a4'
        | 'a5'
        | 'a6'
        | 'a7'
        | 'a8'
        | 'a9'
        | 'a10'
        | 'b0'
        | 'b1'
        | 'b2'
        | 'b3'
        | 'b4'
        | 'b5'
        | 'b6'
        | 'b7'
        | 'b8'
        | 'b9'
        | 'b10'
        | 'c0'
        | 'c1'
        | 'c2'
        | 'c3'
        | 'c4'
        | 'c5'
        | 'c6'
        | 'c7'
        | 'c8'
        | 'c9'
        | 'c10'
        | 'd1'
        | 'letter'
        | 'government-letter'
        | 'legal'
        | 'junior-legal'
        | 'ledger'
        | 'tabloid'
        | 'credit-card';
      putOnlyUsedFonts?: boolean;
      putTotalPages?: boolean;
      compress?: boolean;
      precision?: number;
      userUnit?: number;
      hotfixes?: string[];
      encryption?: {
        userPassword?: string;
        ownerPassword?: string;
        userPermissions?: string[];
      };
      floatPrecision?: number | 'smart';
    };
  };

  type Html2PdfThen = {
    output: (value: string) => blob;
    setPage(value: number);
    addImage(
      docImg: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number,
      alias: string,
      compression: string,
      rotation?: number
    );
    internal: {
      getNumberOfPages();
      pageSize: {
        getWidth();
        getHeight();
      };
    };
  };

  class Html2PdfClass {
    constructor(options?: Html2PdfOptions);
    from(element: string | Element): Html2PdfClass;
    set(options: Html2PdfOptions): Html2PdfClass;
    save(filename?: string): void;
    toPdf(): Html2PdfClass;
    get(type: string): Html2PdfClass;
    then(type: (pdf: Html2PdfThen) => void): void;
  }

  type Html2Pdf = typeof html2pdf;

  export default function html2pdf(): Html2PdfClass;
}
