declare module 'html2pdf.js' {
  interface Html2PdfJsOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string | number[];
      orientation?: 'portrait' | 'landscape';
    };
  }

  interface Html2PdfJsInstance {
    from(source: HTMLElement | string): Html2PdfJsInstance;
    set(options: Html2PdfJsOptions): Html2PdfJsInstance;
    save(filename?: string): Promise<void>;
    toPdf(): Html2PdfJsInstance;
    outputPdf(): Promise<Blob>;
  }

  interface Html2PdfJsStatic {
    (): Html2PdfJsInstance;
    (source: HTMLElement | string, options?: Html2PdfJsOptions): Html2PdfJsInstance;
  }

  const html2pdf: Html2PdfJsStatic;
  export default html2pdf;
}
