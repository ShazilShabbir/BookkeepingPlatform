declare module 'pdfmake/build/pdfmake' {
  interface TCreatedPdf {
    download(filename?: string): void;
    open(): void;
    print(): void;
    getBlob(callback: (blob: Blob) => void): void;
    getBase64(callback: (data: string) => void): void;
    getDataUrl(callback: (data: string) => void): void;
    getBuffer(callback: (buffer: Buffer) => void): void;
  }

  interface PdfMake {
    createPdf(docDefinition: any, tableLayouts?: any, fonts?: any, vfs?: any): TCreatedPdf;
    vfs: any;
    fonts: any;
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: { vfs: Record<string, string> };
  export default vfs;
}
